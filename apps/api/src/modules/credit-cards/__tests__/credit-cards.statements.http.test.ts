import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createBalanceEntryForAccount,
  createCreditCardOwner,
} from "@/test/factories";
import {
  interNov2026,
  nubankNov2026,
  nubankOct2026,
  nubankSep2026,
} from "../statements/__tests__/statement.fixtures";

type Context = Awaited<ReturnType<typeof createAuthenticatedContext>>;

/**
 * The issuer is the source of truth. These cases are the ones real invoices produced: the issuer's cents differ from
 * Luraba's even split (`remainder_last`), and every invoice must end up equal to the issuer's total.
 */
async function setup(name = "Statement Card") {
  const context = await createAuthenticatedContext();
  const category = await categoriesService.createCategory(
    context.householdContext,
    buildCategoryInput({ name: "Shopping", type: "expense" }),
  );
  const ownerAccount = await createCreditCardOwner(context.householdContext);
  const source = await accountsService.createAccount(
    context.householdContext,
    buildAccountInput({ name: "Checking", type: "cash", currencyCode: "BRL" }),
  );
  await createBalanceEntryForAccount({
    householdId: context.household.id,
    accountId: source.id,
    amount: 10_000_000,
  });
  const card = await request(app)
    .post("/api/v1/credit-cards")
    .set(createAuthHeaders(context.token, context.household.id))
    .send(
      buildCreditCardInput({
        ownerAccountId: ownerAccount.id,
        name,
        closingDay: 25,
        dueDay: 5,
        creditLimitAmount: 100_000_000,
      }),
    );
  return {
    context,
    categoryId: category.id,
    sourceId: source.id,
    cardId: card.body.data.id as string,
  };
}

type Setup = Awaited<ReturnType<typeof setup>>;

const headers = (context: Context) => createAuthHeaders(context.token, context.household.id);

async function buy(
  { context, categoryId, cardId }: Setup,
  description: string,
  postedDate: string,
  total: number,
  installmentCount: number,
  extra: Record<string, unknown> = {},
) {
  const response = await request(app)
    .post(`/api/v1/credit-cards/${cardId}/purchases`)
    .set(headers(context))
    .send({
      description,
      categoryId,
      purchaseDate: postedDate,
      postedDate,
      amount: total,
      installmentCount,
      includeInBudget: false,
      ...extra,
    });
  expect(response.status).toBe(201);
  return response.body.data as {
    purchaseId: string;
    amount: number;
    installments: { installmentId: string; amount: number; billingCycleId: string }[];
  };
}

async function pay({ context, cardId, sourceId }: Setup, amount: number, paymentDate: string) {
  const response = await request(app)
    .post(`/api/v1/credit-cards/${cardId}/payments`)
    .set(headers(context))
    .send({ amount, fromAccountId: sourceId, paymentDate });
  expect(response.status).toBe(201);
  return response.body.data as {
    paymentId: string;
    allocations: { billingCycleId: string; amount: number }[];
    roundingMismatch: { billingCycleId: string; difference: number } | null;
  };
}

async function invoice(setupResult: Setup, month: string) {
  const response = await request(app)
    .get(`/api/v1/credit-cards/overview?month=${month}`)
    .set(headers(setupResult.context));
  expect(response.status).toBe(200);
  const card = response.body.data.cards.find(
    (item: { creditCardId: string }) => item.creditCardId === setupResult.cardId,
  );
  return card.invoice as {
    cycleId: string;
    statementAmount: number;
    paidAmount: number;
    remainingAmount: number;
    reconciledAt: string | null;
    roundingMismatch: number | null;
  };
}

function statement(
  setupResult: Setup,
  action: "statements" | "statements/preview",
  month: string,
  content: string,
  extra: Record<string, unknown> = {},
) {
  return request(app)
    .post(`/api/v1/credit-cards/${setupResult.cardId}/${action}`)
    .set(headers(setupResult.context))
    .send({ fileName: `statement-${month}.csv`, content, month, ...extra });
}

/** Luraba's side of the Nubank cases: an even split, the last installment taking the leftover cents. */
async function seedNubank(setupResult: Setup) {
  const purchases = {
    kabum: await buy(setupResult, "KaBuM", "2026-07-10", 478_631, 10),
    decolar: await buy(setupResult, "Decolar", "2026-08-14", 72_978, 2),
    wipers: await buy(setupResult, "Wiper blades", "2026-08-15", 21_021, 2),
    touti: await buy(setupResult, "Touti", "2026-08-21", 7_990, 3),
    riachuelo: await buy(setupResult, "Riachuelo", "2026-08-24", 39_998, 3),
    coffee: await buy(setupResult, "Coffee shop", "2026-08-20", 1_250, 1),
  };
  return purchases;
}

describe("card statement import", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("previews without writing, then makes Sep, Oct and Nov match the issuer to the cent", async () => {
    const s = await setup();
    await seedNubank(s);
    // Luraba's split is a cent or two off the issuer's every month.
    expect((await invoice(s, "2026-09")).statementAmount).toBe(112_107);
    expect((await invoice(s, "2026-10")).statementAmount).toBe(110_858);
    expect((await invoice(s, "2026-11")).statementAmount).toBe(63_861);

    const preview = await statement(s, "statements/preview", "2026-09", nubankSep2026);
    expect(preview.status).toBe(200);
    expect(preview.body.data).toMatchObject({
      dryRun: true,
      issuerTotal: 112_111,
      lurabaTotalBefore: 112_107,
      lurabaTotalAfter: 112_111,
      reconciled: true,
      summary: { matched: 3, corrected: 3, review: 0, missing: 0, extra: 0 },
    });
    expect((await invoice(s, "2026-09")).statementAmount).toBe(112_107);

    for (const [month, text, total] of [
      ["2026-09", nubankSep2026, 112_111],
      ["2026-10", nubankOct2026, 110_857],
      ["2026-11", nubankNov2026, 63_858],
    ] as const) {
      const applied = await statement(s, "statements", month, text);
      expect(applied.status).toBe(201);
      expect(applied.body.data).toMatchObject({
        dryRun: false,
        reconciled: true,
        remainingDifference: 0,
        summary: { missing: 0, extra: 0, review: 0 },
      });
      const after = await invoice(s, month);
      expect(after.statementAmount).toBe(total);
      expect(after.reconciledAt).not.toBeNull();
    }

    // The cases from the real invoices.
    const audits = await request(app)
      .get(`/api/v1/credit-cards/${s.cardId}/installment-audits`)
      .set(headers(s.context));
    const notes = (audits.body.data as { note: string; source: string }[]).map((row) => row.note);
    expect(notes).toContain("Wiper blades inst 1: 105.10 -> 105.11, from Nubank 2026-09 statement");
    expect(notes).toContain("Wiper blades inst 2: 105.11 -> 105.10, from Nubank 2026-10 statement");
    expect(notes).toContain("KaBuM inst 3: 478.63 -> 478.64, from Nubank 2026-10 statement");
    expect(notes).toContain("Decolar inst 1: 364.89 -> 364.90, from Nubank 2026-09 statement");
    expect(notes).toContain("Touti inst 3: 26.64 -> 26.63, from Nubank 2026-11 statement");
    expect(audits.body.data.every((row: { source: string }) => row.source === "statement")).toBe(
      true,
    );
  });

  it("allocates payments with no phantom cents and flags the rounding mismatch before the import", async () => {
    const s = await setup();
    await seedNubank(s);
    await pay(s, 47_863, "2026-08-10"); // August invoice (KaBuM 1/10), exact
    const septemberPayment = await pay(s, 112_111, "2026-09-05"); // what the issuer billed
    // Luraba's September invoice is 4 cents short, so 4 cents spill into October: the mismatch is flagged.
    expect(septemberPayment.allocations).toHaveLength(2);
    expect(septemberPayment.roundingMismatch?.difference).toBe(4);
    const flagged = await invoice(s, "2026-09");
    expect(flagged.roundingMismatch).toBe(4);

    await statement(s, "statements", "2026-09", nubankSep2026);
    const september = await invoice(s, "2026-09");
    expect(september).toMatchObject({
      statementAmount: 112_111,
      paidAmount: 112_111,
      remainingAmount: 0,
      roundingMismatch: null,
    });
    // October got no spill from September.
    const october = await invoice(s, "2026-10");
    expect(october.paidAmount).toBe(0);

    // Under-payment by a cent: October is paid with what the issuer billed.
    await pay(s, 110_857, "2026-10-05");
    const beforeOct = await invoice(s, "2026-10");
    expect(beforeOct.roundingMismatch).toBe(-1);
    await statement(s, "statements", "2026-10", nubankOct2026);
    const afterOct = await invoice(s, "2026-10");
    expect(afterOct).toMatchObject({
      statementAmount: 110_857,
      paidAmount: 110_857,
      remainingAmount: 0,
      roundingMismatch: null,
    });
  });

  it("sends differences above R$ 0.05 to review and changes nothing", async () => {
    const s = await setup();
    await buy(s, "Gym", "2026-08-20", 20_000, 2);
    const csv = "date,title,amount\n2026-08-20,Gym - Parcela 1/2,150.00";
    const applied = await statement(s, "statements", "2026-09", csv);
    expect(applied.status).toBe(201);
    expect(applied.body.data.summary).toMatchObject({ review: 1, corrected: 0, matched: 0 });
    expect(applied.body.data.reconciled).toBe(false);
    expect(applied.body.data.remainingDifference).toBe(-5_000);
    expect(applied.body.data.lines[0]).toMatchObject({ status: "review", difference: 5_000 });
    expect((await invoice(s, "2026-09")).statementAmount).toBe(10_000);
    const audits = await request(app)
      .get(`/api/v1/credit-cards/${s.cardId}/installment-audits`)
      .set(headers(s.context));
    expect(audits.body.data).toEqual([]);
  });

  it("reports missing statement lines and installments that are not on the statement", async () => {
    const s = await setup();
    await buy(s, "Gym", "2026-08-20", 20_000, 2);
    const csv = "date,title,amount\n2026-08-21,Spotify,21.90";
    const preview = await statement(s, "statements/preview", "2026-09", csv);
    expect(preview.body.data.summary).toMatchObject({ missing: 1, extra: 1, matched: 0 });
    expect(preview.body.data.lines[0]).toMatchObject({ status: "missing", description: "Spotify" });
    expect(preview.body.data.extra[0]).toMatchObject({ description: "Gym", amount: 10_000 });
    expect(preview.body.data.reconciled).toBe(false);
  });

  it("locks a reconciled invoice until an explicit override", async () => {
    const s = await setup();
    const purchases = await seedNubank(s);
    await statement(s, "statements", "2026-09", nubankSep2026);
    const decolar = purchases.decolar;
    const first = decolar.installments[0];
    const url = `/api/v1/credit-cards/${s.cardId}/purchases/${decolar.purchaseId}`;

    const refused = await request(app)
      .patch(`${url}/installments/${first?.installmentId}`)
      .set(headers(s.context))
      .send({ amount: 36_000 });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("RECONCILED_INVOICE");

    expect(
      (
        await request(app)
          .patch(url)
          .set(headers(s.context))
          .send({ installmentAmounts: [30_000, 30_000] })
      ).status,
    ).toBe(409);
    expect((await request(app).delete(url).set(headers(s.context))).status).toBe(409);
    // Text-only edits are not blocked.
    expect(
      (await request(app).patch(url).set(headers(s.context)).send({ notes: "gift" })).status,
    ).toBe(200);
    const shown = await request(app).get(url).set(headers(s.context));
    expect(shown.body.data.installments[0].locked).toBe(true);

    const allowed = await request(app)
      .patch(`${url}/installments/${first?.installmentId}`)
      .set(headers(s.context))
      .send({ amount: 36_000, override: true });
    expect(allowed.status).toBe(200);
    const unlocked = await invoice(s, "2026-09");
    expect(unlocked.reconciledAt).toBeNull();
    const audits = await request(app)
      .get(`/api/v1/credit-cards/${s.cardId}/installment-audits?purchaseId=${decolar.purchaseId}`)
      .set(headers(s.context));
    expect(audits.body.data[0]).toMatchObject({
      source: "override",
      previousAmount: 36_490,
      newAmount: 36_000,
    });
  });

  it("learns the issuer's rounding pattern and uses it as the default split", async () => {
    const s = await setup();
    await seedNubank(s);
    for (const [month, text] of [
      ["2026-09", nubankSep2026],
      ["2026-10", nubankOct2026],
      ["2026-11", nubankNov2026],
    ] as const) {
      await statement(s, "statements", month, text);
    }
    const patterns = await request(app)
      .get(`/api/v1/credit-cards/${s.cardId}/rounding-patterns`)
      .set(headers(s.context));
    expect(patterns.body.data.card).toMatchObject({
      pattern: "first",
      roundingMode: "remainder_first",
    });

    const learned = await buy(s, "Headphones", "2026-11-10", 10_000, 3);
    expect(learned.installments.map((item) => item.amount)).toEqual([3334, 3333, 3333]);
    const explicit = await buy(s, "Cables", "2026-11-10", 10_000, 3, {
      roundingMode: "remainder_last",
    });
    expect(explicit.installments.map((item) => item.amount)).toEqual([3333, 3333, 3334]);
    const exact = await buy(s, "Monitor", "2026-11-10", 10_000, 3, {
      amount: undefined,
      installmentAmounts: [3333, 3333, 3334],
    });
    expect(exact.installments.map((item) => item.amount)).toEqual([3333, 3333, 3334]);
  });

  it("reconciles an invoice by the issuer's closed total", async () => {
    const s = await setup();
    await buy(s, "Gym", "2026-08-20", 20_000, 2);
    const wrong = await request(app)
      .post(`/api/v1/credit-cards/${s.cardId}/cycles/reconcile`)
      .set(headers(s.context))
      .send({ month: "2026-09", issuerTotal: 10_002 });
    expect(wrong.status).toBe(200);
    expect(wrong.body.data).toMatchObject({ reconciled: false, difference: -2 });
    expect((await invoice(s, "2026-09")).reconciledAt).toBeNull();
    const right = await request(app)
      .post(`/api/v1/credit-cards/${s.cardId}/cycles/reconcile`)
      .set(headers(s.context))
      .send({ month: "2026-09", issuerTotal: 10_000 });
    expect(right.body.data).toMatchObject({ reconciled: true, difference: 0 });
    expect((await invoice(s, "2026-09")).reconciledAt).not.toBeNull();
  });

  it("matches the Inter November statement: Shopee 66.34 x3 where Luraba had 66.36 last", async () => {
    const s = await setup("Inter Card");
    await buy(s, "Shopee", "2026-08-03", 19_904, 3);
    await buy(s, "Padaria Central", "2026-10-10", 1_890, 1);
    expect((await invoice(s, "2026-11")).statementAmount).toBe(8_526);
    const applied = await statement(s, "statements", "2026-11", interNov2026);
    expect(applied.status).toBe(201);
    expect(applied.body.data).toMatchObject({
      issuer: "inter",
      issuerTotal: 8_524,
      reconciled: true,
      summary: { corrected: 1, matched: 1, missing: 0, extra: 0 },
    });
    expect((await invoice(s, "2026-11")).statementAmount).toBe(8_524);
  });
});
