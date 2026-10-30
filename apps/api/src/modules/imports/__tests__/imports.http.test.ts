import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import * as merchantsService from "@/modules/merchants/merchants.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  buildMerchantInput,
  createCreditCardOwner,
} from "@/test/factories";
import { bankOfx, cardOfx, simpleXlsx } from "./fixtures";

type Auth = Awaited<ReturnType<typeof createAuthenticatedContext>>;

const headers = (auth: Auth) => createAuthHeaders(auth.token, auth.household.id);

/** The few row/group fields these tests read; everything else on the wire stays untyped. */
type TestRow = {
  id: string;
  description: string;
  displayName: string;
  skip?: boolean;
  status?: string;
  issues: Array<{ code: string }>;
  [key: string]: unknown;
};

type UploadTarget = { accountId?: string; creditCardId?: string };

async function upload(auth: Auth, name: string, content: string, target: UploadTarget = {}) {
  const req = request(app).post("/api/v1/imports").set(headers(auth));
  if (target.accountId) req.field("accountId", target.accountId);
  if (target.creditCardId) req.field("creditCardId", target.creditCardId);
  return req.attach("file", Buffer.from(content, "latin1"), name);
}

async function put(auth: Auth, path: string, body: Record<string, unknown>) {
  return request(app).put(`/api/v1/imports/${path}`).set(headers(auth)).send(body);
}

async function waitForDone(auth: Auth, id: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await request(app).get(`/api/v1/imports/${id}`).set(headers(auth));
    if (response.body.data.status === "completed" || response.body.data.status === "failed")
      return response.body.data;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The import did not finish");
}

async function rowsOf(auth: Auth, id: string, filter = "all") {
  const response = await request(app)
    .get(`/api/v1/imports/${id}/rows`)
    .set(headers(auth))
    .query({ perPage: 100, filter });
  expect(response.status).toBe(200);
  return response.body.data as TestRow[];
}

async function map(auth: Auth, id: string, body: Record<string, unknown>) {
  const response = await request(app)
    .put(`/api/v1/imports/${id}/mappings`)
    .set(headers(auth))
    .send(body);
  expect(response.status).toBe(200);
}

async function groupFor(auth: Auth, id: string, text: string) {
  const response = await request(app).get(`/api/v1/imports/${id}/groups`).set(headers(auth));
  const group = (response.body.data as TestRow[]).find((g) =>
    g.displayName.toLowerCase().includes(text.toLowerCase()),
  );
  if (!group) throw new Error(`no group for ${text}`);
  return group;
}

describe("imports: bank statement", () => {
  it("previews, maps, imports in the background, dedupes a re-import and reconciles", async () => {
    const auth = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Checking", currencyCode: "BRL" }),
    );
    const investment = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Brokerage", type: "investment", currencyCode: "BRL" }),
    );
    const merchant = await merchantsService.createMerchant(
      auth.householdContext,
      buildMerchantInput({ name: "Coffee Co" }),
    );

    const uploaded = await upload(auth, "statement.ofx", bankOfx(), { accountId: account.id });
    expect(uploaded.status).toBe(201);
    const batch = uploaded.body.data;
    expect(batch.parserId).toBe("ofx");
    expect(batch.sourceKind).toBe("bank_account");
    expect(batch.rowCount).toBe(5);
    expect(batch.statementBalance).toBe(109100);

    expect(batch.format).toBe("statement");
    expect(batch.targetAccountId).toBe(account.id);

    // The raw file shows as a plain table; OFX has no columns to map.
    const preview = await request(app)
      .get(`/api/v1/imports/${batch.id}/preview`)
      .set(headers(auth));
    expect(preview.body.data.headers).toEqual(["Date", "Description", "Amount", "ID"]);
    expect(preview.body.data.suggestion).toBeNull();
    expect((await put(auth, `${batch.id}/columns`, { mapping: {} })).status).toBe(422);

    // Investment and card payment rows need a decision; the rest is ready.
    let unmapped = await rowsOf(auth, batch.id, "unmapped");
    expect(unmapped).toHaveLength(2);
    const refusal = await request(app)
      .post(`/api/v1/imports/${batch.id}/start`)
      .set(headers(auth))
      .send({});
    expect(refusal.status).toBe(422);

    const investmentGroup = await groupFor(auth, batch.id, "Cdb Porq");
    await map(auth, batch.id, {
      sourceKey: investmentGroup.sourceKey,
      targetType: "account",
      accountId: investment.id,
    });
    const coffeeGroup = await groupFor(auth, batch.id, "Coffee");
    expect(coffeeGroup.rowCount).toBe(2);
    await map(auth, batch.id, {
      sourceKey: coffeeGroup.sourceKey,
      targetType: "merchant",
      merchantId: merchant.id,
    });
    unmapped = await rowsOf(auth, batch.id, "unmapped");
    expect(unmapped).toHaveLength(1); // the card payment: no card exists

    const started = await request(app)
      .post(`/api/v1/imports/${batch.id}/start`)
      .set(headers(auth))
      .send({ skipInvalid: true });
    expect(started.status).toBe(200);
    const done = await waitForDone(auth, batch.id);
    expect(done.status).toBe("completed");
    expect(done.createdCount).toBe(4);
    expect(done.skippedCount).toBe(1);
    expect(done.failedCount).toBe(0);

    const created = await rowsOf(auth, batch.id, "created");
    expect(created.map((row) => row.kind).sort()).toEqual([
      "expense",
      "expense",
      "income",
      "transfer",
    ]);

    // Reconciliation: Luraba holds 1600 - 300 - 9 = 1291.00; the statement says 1091.00 because the
    // card payment (-200) was skipped, so the check reports a difference of -200.00.
    const reconciliation = await request(app)
      .get(`/api/v1/imports/${batch.id}/reconciliation`)
      .set(headers(auth));
    expect(reconciliation.status).toBe(200);
    expect(reconciliation.body.data.luraba.balance).toBe(129100);
    expect(reconciliation.body.data.balanceDifference).toBe(-20000);
    expect(reconciliation.body.data.matches).toBe(false);
    expect(reconciliation.body.data.statement.impliedOpeningBalance).toBe(0);
    expect(reconciliation.body.data.openingDifference).toBe(0);
    expect(reconciliation.body.data.missingInLuraba).toBe(1);

    // Importing the same file again creates nothing.
    const again = (await upload(auth, "statement.ofx", bankOfx(), { accountId: account.id })).body
      .data;
    const duplicates = await rowsOf(auth, again.id, "duplicates");
    expect(duplicates).toHaveLength(4);
    await request(app)
      .post(`/api/v1/imports/${again.id}/start`)
      .set(headers(auth))
      .send({ skipInvalid: true });
    const second = await waitForDone(auth, again.id);
    expect(second.createdCount).toBe(0);
    expect(second.duplicateCount).toBe(4);

    // Mappings are remembered: a fresh upload arrives with the Coffee group already mapped.
    const third = (await upload(auth, "statement.ofx", bankOfx(), { accountId: account.id })).body
      .data;
    const remembered = await groupFor(auth, third.id, "Coffee");
    expect(remembered.mapping.merchantId).toBe(merchant.id);
  });

  it("keeps two identical transfers on one day as two movements", async () => {
    const auth = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Checking", currencyCode: "BRL" }),
    );
    const savings = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Savings", type: "investment", currencyCode: "BRL" }),
    );
    const transfer = (fitid: string) => `<STMTTRN>
<TRNTYPE>PAYMENT
<DTPOSTED>20261005
<TRNAMT>-250.00
<FITID>${fitid}
<MEMO>Aplicacao: "CDB Reserve"
<NAME>Cdb Reserve
</STMTTRN>`;
    const ofx = bankOfx().replace(
      /<STMTTRN>[\s\S]*<\/BANKTRANLIST>/,
      `${transfer("A1")}\n${transfer("A2")}\n</BANKTRANLIST>`,
    );

    const batch = (await upload(auth, "twice.ofx", ofx, { accountId: account.id })).body.data;
    expect(batch.rowCount).toBe(2);
    const group = await groupFor(auth, batch.id, "Cdb Reserve");
    await map(auth, batch.id, {
      sourceKey: group.sourceKey,
      targetType: "account",
      accountId: savings.id,
    });
    await request(app).post(`/api/v1/imports/${batch.id}/start`).set(headers(auth)).send({});
    const done = await waitForDone(auth, batch.id);
    expect(done.createdCount).toBe(2);
    expect(done.duplicateCount).toBe(0);
  });

  it("keeps other households out", async () => {
    const owner = await createAuthenticatedContext();
    const other = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      owner.householdContext,
      buildAccountInput({ name: "Checking", currencyCode: "BRL" }),
    );
    const batch = (await upload(owner, "statement.ofx", bankOfx(), { accountId: account.id })).body
      .data;
    const response = await request(app).get(`/api/v1/imports/${batch.id}`).set(headers(other));
    expect(response.status).toBe(404);
  });

  it("rejects unknown formats, a missing target and the wrong kind of target", async () => {
    const auth = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Checking", currencyCode: "BRL" }),
    );
    expect((await upload(auth, "notes.pdf", "hello", { accountId: account.id })).status).toBe(422);
    expect((await upload(auth, "statement.ofx", bankOfx())).status).toBe(422);

    const owner = await createCreditCardOwner(auth.householdContext);
    const card = await creditCardsService.createCreditCard(
      auth.householdContext,
      buildCreditCardInput({ ownerAccountId: owner.id, name: "Card" }),
    );
    const wrong = await upload(auth, "statement.ofx", bankOfx(), { creditCardId: card.id });
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.message).toContain("bank account statement");
  });
});

describe("imports: credit card statement", () => {
  it("nets reversals, turns installment lines into purchases and needs a payer for payments", async () => {
    const auth = await createAuthenticatedContext();
    const owner = await createCreditCardOwner(auth.householdContext);
    const card = await creditCardsService.createCreditCard(
      auth.householdContext,
      buildCreditCardInput({ ownerAccountId: owner.id, name: "Card" }),
    );
    const payer = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Payer", currencyCode: "BRL" }),
    );

    const batch = (await upload(auth, "card.ofx", cardOfx(), { creditCardId: card.id })).body.data;
    expect(batch.sourceKind).toBe("credit_card");
    expect(batch.rowCount).toBe(6);

    const rows = await rowsOf(auth, batch.id);
    const reversal = rows.find((row) => row.description.startsWith("IOF refunded"));
    const iof = rows.find((row) => row.description.startsWith("IOF de"));
    expect(reversal?.skip).toBe(true);
    expect(iof?.skip).toBe(true);
    expect(iof?.issues.map((i: { code: string }) => i.code)).toContain("netted");

    const payment = rows.find((row) => row.description === "Pagamento recebido");
    expect(payment?.status).toBe("invalid");
    const group = await groupFor(auth, batch.id, "Pagamento recebido");
    await map(auth, batch.id, {
      sourceKey: group.sourceKey,
      targetType: "account",
      accountId: payer.id,
    });

    // The payment cannot exceed the credit in use, so it fails clearly instead of corrupting data.
    await request(app).post(`/api/v1/imports/${batch.id}/start`).set(headers(auth)).send({});
    const done = await waitForDone(auth, batch.id);
    expect(done.status).toBe("completed");
    const outcomes = await rowsOf(auth, batch.id);
    const installment = outcomes.find((row) => row.installmentNumber === 4);
    expect(installment?.outcome).toBe("created");
    expect(installment?.kind).toBe("card_purchase");
    expect(outcomes.find((row) => row.description === "Foreign Sub")?.outcome).toBe("created");
    expect(outcomes.find((row) => row.description.startsWith("IOF de"))?.outcome).toBe("skipped");
    expect(done.createdCount + done.skippedCount + done.duplicateCount + done.failedCount).toBe(6);

    // The next month's line of the same plan is recognized, not bought again.
    const next = cardOfx().replace("Parcela 4/12", "Parcela 5/12").replace("20260928", "20261028");
    const nextBatch = (await upload(auth, "card-next.ofx", next, { creditCardId: card.id })).body
      .data;
    const nextRows = await rowsOf(auth, nextBatch.id);
    const plan = nextRows.find((row) => row.installmentNumber === 5);
    expect(plan?.status).toBe("duplicate");
  });
});

describe("imports: CSV wizard", () => {
  const csv = [
    "Data;Descricao;Valor;Categoria;Estabelecimento",
    "28/10/2026;STARBUCKS #123;-12,90;Cafe;Starbucks #123",
    "29/10/2026;Salario;3.000,00;;",
    "30/10/2026;STARBUCKS #123;-8,00;Cafe;Starbucks #123",
    "31/10/2026;Bad row;abc;;",
  ].join("\n");

  it("maps columns, maps values, edits and removes rows, imports and remembers the layout", async () => {
    const auth = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Checking", currencyCode: "BRL" }),
    );
    const merchant = await merchantsService.createMerchant(
      auth.householdContext,
      buildMerchantInput({ name: "Starbucks" }),
    );
    const category = await categoriesService.createCategory(
      auth.householdContext,
      buildCategoryInput({ name: "Coffee", type: "expense" }),
    );

    const uploaded = await upload(auth, "bank.csv", csv, { accountId: account.id });
    expect(uploaded.status).toBe(201);
    const batch = uploaded.body.data;
    expect(batch.format).toBe("table");
    expect(batch.columnMapping).toBeNull();
    expect(batch.rowCount).toBe(0);
    expect(await rowsOf(auth, batch.id)).toHaveLength(0);

    // Step 1: the raw file as written, with a suggestion from Portuguese header aliases.
    const preview = (
      await request(app).get(`/api/v1/imports/${batch.id}/preview`).set(headers(auth))
    ).body.data;
    expect(preview.headers).toEqual(["Data", "Descricao", "Valor", "Categoria", "Estabelecimento"]);
    expect(preview.totalRows).toBe(4);
    expect(preview.rows[0][1]).toBe("STARBUCKS #123");
    expect(preview.suggestionSource).toBe("aliases");
    expect(preview.suggestion).toMatchObject({
      columns: {
        date: "Data",
        description: "Descricao",
        amount: "Valor",
        category: "Categoria",
        merchant: "Estabelecimento",
      },
      dateFormat: "DD/MM/YYYY",
      decimalSeparator: ",",
    });

    // Import is blocked until the required fields are mapped.
    const incomplete = await put(auth, `${batch.id}/columns`, {
      mapping: { ...preview.suggestion, columns: { date: "Data" } },
    });
    expect(incomplete.status).toBe(422);
    expect(incomplete.body.error.message).toBe("Map these fields first: Description, Amount");
    const unknown = await put(auth, `${batch.id}/columns`, {
      mapping: { ...preview.suggestion, columns: { ...preview.suggestion.columns, date: "Nope" } },
    });
    expect(unknown.status).toBe(422);
    const early = await request(app)
      .post(`/api/v1/imports/${batch.id}/start`)
      .set(headers(auth))
      .send({});
    expect(early.status).toBe(422);

    // Step 2: confirm the mapping and keep it as the account's template.
    const mapped = await put(auth, `${batch.id}/columns`, {
      mapping: preview.suggestion,
      saveTemplate: true,
    });
    expect(mapped.status).toBe(200);
    expect(mapped.body.data.rowCount).toBe(4);
    expect(mapped.body.data.columnMapping.dateFormat).toBe("DD/MM/YYYY");
    expect(mapped.body.data.summary.invalid).toBe(1);

    // Step 3: values. The file's category and merchant text map to Luraba entities.
    const categories = (
      await request(app)
        .get(`/api/v1/imports/${batch.id}/groups`)
        .query({ field: "category" })
        .set(headers(auth))
    ).body.data as TestRow[];
    expect(categories.map((g) => [g.displayName, g.rowCount])).toEqual([["Cafe", 2]]);
    await map(auth, batch.id, {
      field: "category",
      sourceKey: categories[0]?.sourceKey,
      targetType: "none",
      categoryId: category.id,
    });
    const coffee = await groupFor(auth, batch.id, "Starbucks");
    expect(coffee.rowCount).toBe(2);
    await map(auth, batch.id, {
      sourceKey: coffee.sourceKey,
      targetType: "merchant",
      merchantId: merchant.id,
    });
    const afterMap = (await rowsOf(auth, batch.id)).find((row) =>
      row.description.includes("STARBUCKS"),
    );
    const effective = afterMap?.effective as { categoryId?: string } | undefined;
    expect(effective?.categoryId).toBe(category.id);

    // Step 4: edit a description, remove the broken row.
    const rows = await rowsOf(auth, batch.id);
    const salary = rows.find((row) => row.description === "Salario");
    const broken = rows.find((row) => row.description === "Bad row");
    expect(broken?.status).toBe("invalid");
    expect(broken?.issues.map((issue) => (issue as { message?: string }).message)).toEqual([
      'Bad amount: "abc"',
    ]);
    const edit = await request(app)
      .patch(`/api/v1/imports/${batch.id}/rows`)
      .set(headers(auth))
      .send({ rowIds: [salary?.id], descriptionOverride: "Monthly salary" });
    expect(edit.status).toBe(200);
    const remove = await request(app)
      .patch(`/api/v1/imports/${batch.id}/rows`)
      .set(headers(auth))
      .send({ rowIds: [broken?.id], skip: true });
    expect(remove.body.data.summary).toMatchObject({ ready: 3, invalid: 0, skipped: 1 });

    // Step 5: background import.
    const started = await request(app)
      .post(`/api/v1/imports/${batch.id}/start`)
      .set(headers(auth))
      .send({});
    expect(started.status).toBe(200);
    const done = await waitForDone(auth, batch.id);
    expect(done.status).toBe("completed");
    expect(done.createdCount).toBe(3);
    expect(done.skippedCount).toBe(1);

    const transactions = await request(app)
      .get("/api/v1/transactions")
      .set(headers(auth))
      .query({ perPage: 50 });
    const descriptions = (transactions.body.data as Array<{ description: string }>).map(
      (t) => t.description,
    );
    expect(descriptions).toContain("Monthly salary");

    // The next file with the same layout arrives mapped by the saved template, and every line is a duplicate.
    const again = (await upload(auth, "bank-again.csv", csv, { accountId: account.id })).body.data;
    const againPreview = (
      await request(app).get(`/api/v1/imports/${again.id}/preview`).set(headers(auth))
    ).body.data;
    expect(againPreview.suggestionSource).toBe("template");
    await put(auth, `${again.id}/columns`, { mapping: againPreview.suggestion });
    const duplicates = await rowsOf(auth, again.id, "duplicates");
    expect(duplicates).toHaveLength(3);
  });

  it("imports an Excel file through the same columns", async () => {
    const auth = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Checking", currencyCode: "BRL" }),
    );
    const response = await request(app)
      .post("/api/v1/imports")
      .set(headers(auth))
      .field("accountId", account.id)
      .attach("file", simpleXlsx(), "bank.xlsx");
    expect(response.status).toBe(201);
    const preview = (
      await request(app).get(`/api/v1/imports/${response.body.data.id}/preview`).set(headers(auth))
    ).body.data;
    expect(preview.suggestion.columns).toMatchObject({ date: "Date", amount: "Amount" });
    expect(preview.suggestion.dateFormat).toBe("YYYY-MM-DD");
    const mapped = await put(auth, `${response.body.data.id}/columns`, {
      mapping: preview.suggestion,
    });
    expect(mapped.body.data.summary.ready).toBe(1);
  });
});

describe("imports: card installments", () => {
  const file = (name: string, date: string) =>
    [
      "date,title,amount",
      `${date},${name},"29,59"`,
      `${date},IOF de Anthropic,"3,98"`,
      `${date},IOF de volta de Anthropic,"- 3,98"`,
    ].join("\n");

  async function setInstallment(auth: Auth, id: string, rowId: string, number: number) {
    return request(app)
      .patch(`/api/v1/imports/${id}/rows`)
      .set(headers(auth))
      .send({ rowIds: [rowId], installment: { number, total: 12 } });
  }

  it("takes the installment from the user, backfills the plan and never reads the text", async () => {
    const auth = await createAuthenticatedContext();
    const owner = await createCreditCardOwner(auth.householdContext);
    const card = await creditCardsService.createCreditCard(
      auth.householdContext,
      buildCreditCardInput({ ownerAccountId: owner.id, name: "Card" }),
    );

    const first = (
      await upload(auth, "sep.csv", file("Terabyteshop - NuPay - Parcela 4/12", "2026-09-28"), {
        creditCardId: card.id,
      })
    ).body.data;
    const preview = (
      await request(app).get(`/api/v1/imports/${first.id}/preview`).set(headers(auth))
    ).body.data;
    expect(preview.suggestion).toMatchObject({
      amountSign: "positive_is_out",
      installmentsFromDescription: false,
      dateFormat: "YYYY-MM-DD",
      decimalSeparator: ",",
    });
    await put(auth, `${first.id}/columns`, { mapping: preview.suggestion });

    // Nothing was read from the description: it is a single purchase until the user says otherwise.
    const rows = await rowsOf(auth, first.id);
    const plan = rows.find((row) => row.description.includes("Terabyteshop"));
    expect(plan).toMatchObject({ installmentNumber: null, kind: "card_purchase" });
    // The charge and its reversal offset each other and start removed.
    expect(rows.filter((row) => row.skip)).toHaveLength(2);

    const marked = await setInstallment(auth, first.id, plan?.id as string, 4);
    expect(marked.status).toBe(200);
    const after = (await rowsOf(auth, first.id)).find((row) => row.id === plan?.id);
    expect(after).toMatchObject({ installmentNumber: 4, installmentTotal: 12 });

    await request(app).post(`/api/v1/imports/${first.id}/start`).set(headers(auth)).send({});
    const done = await waitForDone(auth, first.id);
    expect(done.createdCount).toBe(1);

    // Next month the bank prints a different name; the user marks installment 5 of 12 and the
    // plan is recognized by date, count and amount alone.
    const second = (
      await upload(auth, "oct.csv", file("TERABYTE SHOP 5 de 12", "2026-10-28"), {
        creditCardId: card.id,
      })
    ).body.data;
    await put(auth, `${second.id}/columns`, { mapping: preview.suggestion });
    const next = (await rowsOf(auth, second.id)).find((row) =>
      row.description.includes("TERABYTE"),
    );
    expect(next?.status).toBe("ready");
    await setInstallment(auth, second.id, next?.id as string, 5);
    const flagged = (await rowsOf(auth, second.id)).find((row) => row.id === next?.id);
    expect(flagged?.status).toBe("duplicate");
    expect(flagged?.issues.map((issue) => (issue as { message?: string }).message)).toContain(
      "Installment plan already imported.",
    );

    // Opt-in text reading still works, and is off unless the user switches it on.
    const third = (
      await upload(auth, "nov.csv", file("Terabyteshop - Parcela 6/12", "2026-11-28"), {
        creditCardId: card.id,
      })
    ).body.data;
    await put(auth, `${third.id}/columns`, {
      mapping: { ...preview.suggestion, installmentsFromDescription: true },
    });
    const read = (await rowsOf(auth, third.id)).find((row) => row.description.includes("Terabyte"));
    expect(read).toMatchObject({ installmentNumber: 6, installmentTotal: 12, status: "duplicate" });
  });
});

describe("exports", () => {
  it("lists exporters and downloads CSV and JSON", async () => {
    const auth = await createAuthenticatedContext();
    await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Exported account", currencyCode: "BRL" }),
    );

    const list = await request(app).get("/api/v1/exports").set(headers(auth));
    expect(list.status).toBe(200);
    expect(list.body.data.map((e: { id: string }) => e.id)).toContain("transactions");

    const csv = await request(app).get("/api/v1/exports/accounts?format=csv").set(headers(auth));
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain("Exported account");

    const json = await request(app)
      .get("/api/v1/exports/everything?format=json")
      .set(headers(auth));
    expect(json.status).toBe(200);
    expect(Object.keys(JSON.parse(json.text))).toEqual(
      expect.arrayContaining(["transactions", "accounts", "merchants"]),
    );

    const bad = await request(app).get("/api/v1/exports/everything?format=csv").set(headers(auth));
    expect(bad.status).toBe(422);
    const missing = await request(app).get("/api/v1/exports/nope").set(headers(auth));
    expect(missing.status).toBe(404);
  });
});
