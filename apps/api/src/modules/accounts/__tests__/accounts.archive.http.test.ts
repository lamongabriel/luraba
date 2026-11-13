import request from "supertest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, buildCreditCardInput, createCreditCardOwner } from "@/test/factories";

const date = new Date("2026-03-10T00:00:00.000Z");

async function setup() {
  const context = await createAuthenticatedContext();
  const headers = createAuthHeaders(context.token, context.household.id);
  const ctx = context.householdContext;
  const xp = await accountsService.createAccount(
    ctx,
    buildAccountInput({ name: "XP", type: "cash", openingBalance: 0 }),
  );
  const loan = await accountsService.createAccount(
    ctx,
    buildAccountInput({ name: "Loan to Mom", type: "cash", openingBalance: 200_000 }),
  );
  return { context, headers, ctx, xp, loan };
}

/** Moves everything out of `from` into `to`, leaving `from` at zero like a paid-off loan. */
async function drain(ctx: Awaited<ReturnType<typeof setup>>["ctx"], from: string, to: string) {
  return transactionsService.createTransaction(ctx, {
    type: "transfer",
    description: "Repayment",
    fromAmount: 200_000,
    fromAccountId: from,
    toAccountId: to,
    purchaseDate: date,
    postedDate: date,
  });
}

describe("account archive", () => {
  it("rejects archiving an account that still has a balance", async () => {
    const { headers, loan } = await setup();

    const response = await request(app).post(`/api/v1/accounts/${loan.id}/archive`).set(headers);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("balance");
  });

  it("archives at zero, hides from the default list, keeps history and other balances", async () => {
    const { headers, ctx, xp, loan } = await setup();
    await transactionsService.createTransaction(ctx, {
      type: "expense",
      description: "Mom's groceries",
      amount: 5_000,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: loan.id,
      purchaseDate: date,
      postedDate: date,
    });
    await transactionsService.createTransaction(ctx, {
      type: "transfer",
      description: "Repayment",
      fromAmount: 195_000,
      fromAccountId: loan.id,
      toAccountId: xp.id,
      purchaseDate: date,
      postedDate: date,
    });
    const xpBefore = await accountsService.getAccountDetails(ctx, xp.id);
    expect(xpBefore.balance).toBe(195_000);

    const archived = await request(app).post(`/api/v1/accounts/${loan.id}/archive`).set(headers);
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toEqual(expect.any(String));

    const defaultList = await request(app).get("/api/v1/accounts").set(headers);
    expect(defaultList.body.data.map((a: { id: string }) => a.id)).not.toContain(loan.id);
    const fullList = await request(app).get("/api/v1/accounts?includeArchived=true").set(headers);
    expect(fullList.body.data.map((a: { id: string }) => a.id)).toContain(loan.id);

    const xpAfter = await accountsService.getAccountDetails(ctx, xp.id);
    expect(xpAfter.balance).toBe(xpBefore.balance);
    const xpFeed = await request(app).get(`/api/v1/accounts/${xp.id}/transactions`).set(headers);
    expect(xpFeed.body.data).toHaveLength(1);
    const loanFeed = await request(app)
      .get(`/api/v1/accounts/${loan.id}/transactions`)
      .set(headers);
    expect(loanFeed.status).toBe(200);
    expect(loanFeed.body.data.length).toBeGreaterThanOrEqual(3);

    const analytics = await request(app).get("/api/v1/transactions/analytics").set(headers);
    expect(analytics.status).toBe(200);
    expect(analytics.body.data.metrics.moneyOut.value).toBe(5_000);
  });

  it("rejects new transactions, transfers and adjustments on an archived account", async () => {
    const { headers, ctx, xp, loan } = await setup();
    await drain(ctx, loan.id, xp.id);
    await request(app).post(`/api/v1/accounts/${loan.id}/archive`).set(headers);

    const expense = await request(app).post("/api/v1/transactions").set(headers).send({
      type: "expense",
      description: "Nope",
      amount: 100,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: loan.id,
      purchaseDate: "2026-03-11",
      postedDate: "2026-03-11",
    });
    expect(expense.status).toBe(409);
    expect(expense.body.error.message).toContain("archived");

    const transfer = await request(app).post("/api/v1/transactions").set(headers).send({
      type: "transfer",
      description: "Nope",
      fromAmount: 100,
      fromAccountId: xp.id,
      toAccountId: loan.id,
      purchaseDate: "2026-03-11",
      postedDate: "2026-03-11",
    });
    expect(transfer.status).toBe(409);

    const adjustment = await request(app).post("/api/v1/transactions").set(headers).send({
      type: "adjustment",
      description: "Nope",
      accountId: loan.id,
      balance: 500,
      purchaseDate: "2026-03-11",
      postedDate: "2026-03-11",
    });
    expect(adjustment.status).toBe(409);
  });

  it("unarchive restores the account and allows transactions again", async () => {
    const { headers, ctx, xp, loan } = await setup();
    await drain(ctx, loan.id, xp.id);
    await request(app).post(`/api/v1/accounts/${loan.id}/archive`).set(headers);

    const restored = await request(app).post(`/api/v1/accounts/${loan.id}/unarchive`).set(headers);
    expect(restored.status).toBe(200);
    expect(restored.body.data.archivedAt).toBeNull();
    expect(restored.body.data.name).toBe("Loan to Mom");

    const list = await request(app).get("/api/v1/accounts").set(headers);
    expect(list.body.data.map((a: { id: string }) => a.id)).toContain(loan.id);
    await expect(
      transactionsService.createTransaction(ctx, {
        type: "transfer",
        description: "Again",
        fromAmount: 100,
        fromAccountId: xp.id,
        toAccountId: loan.id,
        purchaseDate: date,
        postedDate: date,
      }),
    ).resolves.toBeDefined();
  });

  it("is idempotent and 404s for unknown accounts", async () => {
    const { headers, ctx, xp, loan } = await setup();
    await drain(ctx, loan.id, xp.id);
    const first = await request(app).post(`/api/v1/accounts/${loan.id}/archive`).set(headers);
    const second = await request(app).post(`/api/v1/accounts/${loan.id}/archive`).set(headers);
    expect(second.status).toBe(200);
    expect(second.body.data.archivedAt).toBe(first.body.data.archivedAt);

    const missing = await request(app)
      .post(`/api/v1/accounts/${crypto.randomUUID()}/archive`)
      .set(headers);
    expect(missing.status).toBe(404);
  });

  it("refuses to archive an account that owns an active credit card", async () => {
    const { context, headers, ctx } = await setup();
    const owner = await createCreditCardOwner(ctx);
    const card = await creditCardsService.createCreditCard(
      ctx,
      buildCreditCardInput({ ownerAccountId: owner.id }),
    );

    const blocked = await request(app).post(`/api/v1/accounts/${owner.id}/archive`).set(headers);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toContain("credit cards");

    await request(app).post(`/api/v1/credit-cards/${card.id}/archive`).set(headers);
    const ok = await request(app).post(`/api/v1/accounts/${owner.id}/archive`).set(headers);
    expect(ok.status).toBe(200);
    expect(context.household.id).toBeDefined();
  });
});

describe("credit card archive", () => {
  it("archives a settled card, hides it, blocks purchases and restores on unarchive", async () => {
    const { headers, ctx } = await setup();
    const owner = await createCreditCardOwner(ctx);
    const card = await creditCardsService.createCreditCard(
      ctx,
      buildCreditCardInput({ ownerAccountId: owner.id }),
    );

    const archived = await request(app)
      .post(`/api/v1/credit-cards/${card.id}/archive`)
      .set(headers);
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toEqual(expect.any(String));

    const hidden = await request(app).get("/api/v1/credit-cards").set(headers);
    expect(hidden.body.data.map((c: { id: string }) => c.id)).not.toContain(card.id);
    const shown = await request(app).get("/api/v1/credit-cards?includeArchived=true").set(headers);
    expect(shown.body.data.map((c: { id: string }) => c.id)).toContain(card.id);

    const purchase = await request(app)
      .post(`/api/v1/credit-cards/${card.id}/purchases`)
      .set(headers)
      .send({ description: "Nope", amount: 1_000, purchaseDate: "2026-03-11" });
    expect(purchase.status).toBe(409);
    expect(purchase.body.error.message).toContain("archived");

    const restored = await request(app)
      .post(`/api/v1/credit-cards/${card.id}/unarchive`)
      .set(headers);
    expect(restored.body.data.archivedAt).toBeNull();
    const ok = await request(app)
      .post(`/api/v1/credit-cards/${card.id}/purchases`)
      .set(headers)
      .send({ description: "Yes", amount: 1_000, purchaseDate: "2026-03-11" });
    expect(ok.status).toBe(201);
  });

  it("rejects archiving a card that still owes money", async () => {
    const { headers, ctx } = await setup();
    const owner = await createCreditCardOwner(ctx);
    const card = await creditCardsService.createCreditCard(
      ctx,
      buildCreditCardInput({ ownerAccountId: owner.id }),
    );
    await request(app)
      .post(`/api/v1/credit-cards/${card.id}/purchases`)
      .set(headers)
      .send({ description: "Owed", amount: 1_000, purchaseDate: "2026-03-11" });

    const response = await request(app)
      .post(`/api/v1/credit-cards/${card.id}/archive`)
      .set(headers);
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("balance");
  });
});
