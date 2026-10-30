import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import * as merchantsService from "@/modules/merchants/merchants.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import {
  buildAccountInput,
  buildCreditCardInput,
  buildMerchantInput,
  createCreditCardOwner,
} from "@/test/factories";
import { bankOfx, cardOfx } from "./fixtures";

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

async function upload(auth: Auth, name: string, content: string) {
  return request(app)
    .post("/api/v1/imports")
    .set(headers(auth))
    .attach("file", Buffer.from(content, "latin1"), name);
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

    const uploaded = await upload(auth, "statement.ofx", bankOfx());
    expect(uploaded.status).toBe(201);
    const batch = uploaded.body.data;
    expect(batch.parserId).toBe("ofx");
    expect(batch.sourceKind).toBe("bank_account");
    expect(batch.rowCount).toBe(5);
    expect(batch.statementBalance).toBe(109100);

    // No target yet: every row is blocked.
    expect((await rowsOf(auth, batch.id)).every((row) => row.status === "invalid")).toBe(true);

    const targeted = await request(app)
      .patch(`/api/v1/imports/${batch.id}`)
      .set(headers(auth))
      .send({ targetAccountId: account.id });
    expect(targeted.status).toBe(200);

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
    const again = (await upload(auth, "statement.ofx", bankOfx())).body.data;
    await request(app)
      .patch(`/api/v1/imports/${again.id}`)
      .set(headers(auth))
      .send({ targetAccountId: account.id });
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
    const third = (await upload(auth, "statement.ofx", bankOfx())).body.data;
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

    const batch = (await upload(auth, "twice.ofx", ofx)).body.data;
    expect(batch.rowCount).toBe(2);
    await request(app)
      .patch(`/api/v1/imports/${batch.id}`)
      .set(headers(auth))
      .send({ targetAccountId: account.id });
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
    const batch = (await upload(owner, "statement.ofx", bankOfx())).body.data;
    const response = await request(app).get(`/api/v1/imports/${batch.id}`).set(headers(other));
    expect(response.status).toBe(404);
  });

  it("rejects files that no adapter recognizes", async () => {
    const auth = await createAuthenticatedContext();
    const response = await upload(auth, "notes.txt", "hello");
    expect(response.status).toBe(422);
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

    const batch = (await upload(auth, "card.ofx", cardOfx())).body.data;
    expect(batch.sourceKind).toBe("credit_card");
    expect(batch.rowCount).toBe(6);
    await request(app)
      .patch(`/api/v1/imports/${batch.id}`)
      .set(headers(auth))
      .send({ targetCreditCardId: card.id });

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
    const nextBatch = (await upload(auth, "card-next.ofx", next)).body.data;
    await request(app)
      .patch(`/api/v1/imports/${nextBatch.id}`)
      .set(headers(auth))
      .send({ targetCreditCardId: card.id });
    const nextRows = await rowsOf(auth, nextBatch.id);
    const plan = nextRows.find((row) => row.installmentNumber === 5);
    expect(plan?.status).toBe("duplicate");
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
