import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput } from "@/test/factories";
import { connectTestClient } from "../../../../../mcp/src/testing/connect";

const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

/**
 * Money back (refund, cashback, split...) linked to any expense or card purchase, whichever account
 * or card receives the money: net cost, the cap across rows, relinking and unlinking, reports.
 */
describe("money back linked to a purchase", () => {
  let baseUrl: string;
  let close: () => void;

  beforeAll(async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
  });
  afterAll(() => close?.());

  async function setup() {
    const context = await createAuthenticatedContext();
    const headers = createAuthHeaders(context.token, context.household.id);
    const key = await request(app)
      .post("/api/v1/api-keys")
      .set(createAuthHeaders(context.token))
      .send({ name: "money back" });
    const mcp = await connectTestClient({ baseUrl, apiKey: key.body.data.secret });
    const makeAccount = async (name: string, currencyCode = "BRL") => {
      const response = await request(app)
        .post("/api/v1/accounts")
        .set(headers)
        .send(buildAccountInput({ name, currencyCode, openingBalance: 100000 }));
      expect(response.status, JSON.stringify(response.body)).toBe(201);
      return response.body.data.id as string;
    };
    const inter = await makeAccount("Inter");
    const created = await mcp.call("create_credit_card", {
      name: "XP Visa Infinite",
      ownerAccount: "Inter",
      brand: "Visa",
      last4: "4242",
      limit: 50000,
      closingDay: 28,
      dueDay: 5,
    });
    expect(created.isError, created.text).toBe(false);
    const card = created.data.creditCard as { id: string };

    const get = async (path: string) => {
      const response = await request(app).get(`/api/v1/${path}`).set(headers);
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      return response.body;
    };
    const post = (path: string, body: unknown) =>
      request(app)
        .post(`/api/v1/${path}`)
        .set(headers)
        .send(body as object);
    const link = (id: string, originalTransactionId: string | null) =>
      request(app)
        .patch(`/api/v1/transactions/${id}/link-refund`)
        .set(headers)
        .send({ originalTransactionId });
    const buy = async (input: Record<string, unknown>) => {
      const result = await mcp.call("create_transaction", {
        kind: "credit_card_purchase",
        creditCard: "XP",
        createMissing: true,
        ...input,
      });
      expect(result.isError, result.text).toBe(false);
      return result.data.purchase as { purchaseId: string; transactionId: string };
    };
    const refund = (input: Record<string, unknown>) =>
      post("transactions", {
        type: "refund",
        purchaseDate: day(0),
        postedDate: day(0),
        reason: "split",
        description: "Money back",
        ...input,
      });
    const moneyBack = async (id: string) => (await get(`transactions/${id}`)).data.moneyBack;
    const balance = async (path: string) => (await get(path)).data.balance as number;
    const breakdown = async () => {
      const body = await get(`transactions/analytics?dateFrom=${day(-400)}&dateTo=${day(400)}`);
      return Object.fromEntries(
        (body.data.expenseBreakdown.items as { name: string; amount: number }[]).map((item) => [
          item.name,
          item.amount,
        ]),
      ) as Record<string, number>;
    };
    return {
      context,
      mcp,
      headers,
      card,
      inter,
      makeAccount,
      get,
      post,
      link,
      buy,
      refund,
      moneyBack,
      balance,
      breakdown,
    };
  }

  it("links a split paid into a bank account to a card purchase without touching the card", async () => {
    const s = await setup();
    const nubank = await s.makeAccount("Nubank");
    const purchase = await s.buy({
      description: "Lanchonight",
      amount: 270,
      category: "Food",
      date: day(-3),
    });
    const owedBefore = await s.balance(`credit-cards/${s.card.id}`);
    const cardBefore = (await s.get(`credit-cards/${s.card.id}`)).data;
    const nubankBefore = await s.balance(`accounts/${nubank}`);
    expect((await s.breakdown()).Food).toBe(27000);

    const response = await s.refund({
      description: "Split: Chris",
      amount: 8200,
      accountId: nubank,
      originalTransactionId: purchase.transactionId,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data).toMatchObject({
      type: "refund",
      accountId: nubank,
      categoryId: expect.any(String),
      refund: {
        reason: "split",
        creditCardId: null,
        originalTransactionId: purchase.transactionId,
      },
    });

    // Balances: the bank gets the money; the card's debt, limit and invoice do not move.
    expect((await s.balance(`accounts/${nubank}`)) - nubankBefore).toBe(8200);
    const cardAfter = (await s.get(`credit-cards/${s.card.id}`)).data;
    expect(await s.balance(`credit-cards/${s.card.id}`)).toBe(owedBefore);
    expect(cardAfter.remainingCreditAmount).toBe(cardBefore.remainingCreditAmount);
    const cycles = (await s.get(`credit-cards/${s.card.id}/cycles`)).data as {
      statementAmount: number;
    }[];
    expect(cycles.reduce((sum, cycle) => sum + cycle.statementAmount, 0)).toBe(27000);

    // The net cost lives on the purchase.
    const money = await s.moneyBack(purchase.transactionId);
    expect(money).toMatchObject({ totalAmount: 27000, receivedBack: 8200, outOfPocket: 18800 });
    expect(money.entries).toHaveLength(1);
    expect(money.entries[0]).toMatchObject({
      reason: "split",
      amount: 8200,
      accountId: nubank,
      accountName: "Nubank",
    });
    const list = (await s.get(`transactions?perPage=100&dateFrom=${day(-10)}&dateTo=${day(0)}`))
      .data as { id: string; rowKind: string; moneyBack: { outOfPocket: number } | null }[];
    const installmentRow = list.find(
      (row) => row.rowKind === "credit_card_installment" && row.id === purchase.transactionId,
    );
    expect(installmentRow?.moneyBack?.outOfPocket).toBe(18800);
    const refundRow = list.find((row) => row.id === response.body.data.id);
    expect(refundRow?.moneyBack).toBeNull();

    // Reports: it nets into the original's category, from a different account.
    expect((await s.breakdown()).Food).toBe(18800);
    await s.mcp.close();
  });

  it("keeps several money-back rows on one purchase and caps their sum", async () => {
    const s = await setup();
    const nubank = await s.makeAccount("Nubank");
    const purchase = await s.buy({ description: "Dinner", amount: 100, date: day(-2) });
    const first = await s.refund({
      amount: 4000,
      accountId: nubank,
      originalTransactionId: purchase.transactionId,
    });
    const second = await s.refund({
      reason: "cashback",
      amount: 3000,
      accountId: s.inter,
      originalTransactionId: purchase.transactionId,
    });
    const third = await s.refund({
      reason: "refund",
      amount: 2000,
      creditCardId: s.card.id,
      originalTransactionId: purchase.transactionId,
    });
    for (const response of [first, second, third]) {
      expect(response.status, JSON.stringify(response.body)).toBe(201);
    }
    expect(await s.moneyBack(purchase.transactionId)).toMatchObject({
      receivedBack: 9000,
      outOfPocket: 1000,
    });

    const tooMuch = await s.refund({
      amount: 1001,
      accountId: nubank,
      originalTransactionId: purchase.transactionId,
    });
    expect(tooMuch.status).toBe(422);
    const exact = await s.refund({
      amount: 1000,
      accountId: nubank,
      originalTransactionId: purchase.transactionId,
    });
    expect(exact.status).toBe(201);
    const money = await s.moneyBack(purchase.transactionId);
    expect(money.outOfPocket).toBe(0);
    expect(money.entries.map((entry: { reason: string }) => entry.reason).sort()).toEqual([
      "cashback",
      "refund",
      "split",
      "split",
    ]);
    await s.mcp.close();
  });

  it("links, relinks and unlinks an existing row and checks the cap without counting itself", async () => {
    const s = await setup();
    const nubank = await s.makeAccount("Nubank");
    const gift = await s.buy({ description: "Gift card", amount: 100, date: day(-4) });
    const shirt = await s.buy({ description: "Shirt", amount: 60, date: day(-3) });
    const loose = await s.refund({
      reason: "cashback",
      description: "Cashback - gift card",
      amount: 5000,
      accountId: nubank,
    });
    expect(loose.status).toBe(201);
    const id = loose.body.data.id as string;
    expect(loose.body.data.refund.originalTransactionId).toBeNull();
    const balance = await s.balance(`accounts/${nubank}`);
    const category = loose.body.data.categoryId;

    const linked = await s.link(id, gift.transactionId);
    expect(linked.status, JSON.stringify(linked.body)).toBe(200);
    expect(linked.body.data.refund.originalTransactionId).toBe(gift.transactionId);
    expect((await s.moneyBack(gift.transactionId)).receivedBack).toBe(5000);
    // Only the link moved: balance and category are as before.
    expect(await s.balance(`accounts/${nubank}`)).toBe(balance);
    expect(linked.body.data.categoryId).toBe(category);

    // Re-linking the same row to the same purchase does not count it twice.
    expect((await s.link(id, gift.transactionId)).status).toBe(200);
    // Moving it to another purchase: 5000 fits in 6000, and the old purchase is released.
    expect((await s.link(id, shirt.transactionId)).status).toBe(200);
    expect((await s.moneyBack(gift.transactionId)).receivedBack).toBe(0);
    expect((await s.moneyBack(shirt.transactionId)).receivedBack).toBe(5000);
    // A second row that would overflow the shirt is refused.
    const extra = await s.refund({ amount: 1500, accountId: nubank });
    expect((await s.link(extra.body.data.id, shirt.transactionId)).status).toBe(422);
    expect((await s.link(extra.body.data.id, gift.transactionId)).status).toBe(200);

    const unlinked = await s.link(id, null);
    expect(unlinked.status).toBe(200);
    expect(unlinked.body.data.refund.originalTransactionId).toBeNull();
    expect((await s.moneyBack(shirt.transactionId)).receivedBack).toBe(0);
    await s.mcp.close();
  });

  it("rejects links to refunds, to the row itself, across currencies and across households", async () => {
    const s = await setup();
    const usd = await s.makeAccount("Wise", "USD");
    const expense = await s.mcp.call("create_transaction", {
      kind: "expense",
      description: "Pix: Mike",
      amount: 50,
      account: "Inter",
      category: "Shopping",
      createMissing: true,
      date: day(-1),
    });
    const expenseId = expense.data.transaction.id as string;
    const row = await s.refund({ amount: 1000, accountId: s.inter });
    const rowId = row.body.data.id as string;

    expect((await s.link(rowId, rowId)).status).toBe(422);
    const other = await s.refund({ amount: 500, accountId: s.inter });
    expect((await s.link(rowId, other.body.data.id)).status).toBe(422);
    expect((await s.link(expenseId, rowId)).status).toBe(422);
    // A different currency is refused rather than converted.
    const dollars = await s.refund({ amount: 500, accountId: usd });
    const rejected = await s.link(dollars.body.data.id, expenseId);
    expect(rejected.status).toBe(422);
    expect(JSON.stringify(rejected.body)).toMatch(/currency/i);
    const direct = await s.refund({
      amount: 500,
      accountId: usd,
      originalTransactionId: expenseId,
    });
    expect(direct.status).toBe(422);

    // An id from another household is simply not found.
    const stranger = await createAuthenticatedContext();
    const foreign = await request(app)
      .post("/api/v1/accounts")
      .set(createAuthHeaders(stranger.token, stranger.household.id))
      .send(buildAccountInput({ name: "Other", currencyCode: "BRL", openingBalance: 1000 }));
    expect(foreign.status).toBe(201);
    const foreignRefund = await request(app)
      .post("/api/v1/transactions")
      .set(createAuthHeaders(stranger.token, stranger.household.id))
      .send({
        type: "refund",
        reason: "refund",
        description: "Theirs",
        amount: 100,
        accountId: foreign.body.data.id,
        purchaseDate: day(0),
        postedDate: day(0),
      });
    expect(foreignRefund.status).toBe(201);
    expect((await s.link(foreignRefund.body.data.id, expenseId)).status).toBe(404);
    const foreignLink = await s.link(rowId, foreignRefund.body.data.id);
    expect(foreignLink.status).toBe(404);
    await s.mcp.close();
  });

  it("nets a debit expense refunded into another account in the original's category", async () => {
    const s = await setup();
    const nubank = await s.makeAccount("Nubank");
    const expense = await s.mcp.call("create_transaction", {
      kind: "expense",
      description: "Dinner",
      amount: 80,
      account: "Inter",
      category: "Restaurants",
      createMissing: true,
      date: day(-1),
    });
    const expenseId = expense.data.transaction.id as string;
    const response = await s.refund({
      amount: 3000,
      accountId: nubank,
      originalTransactionId: expenseId,
    });
    expect(response.status).toBe(201);
    expect((await s.breakdown()).Restaurants).toBe(5000);
    expect(await s.moneyBack(expenseId)).toMatchObject({
      totalAmount: 8000,
      receivedBack: 3000,
      outOfPocket: 5000,
    });
    await s.mcp.close();
  });

  it("cancel_purchase credits only what is still left after linked money back", async () => {
    const s = await setup();
    const nubank = await s.makeAccount("Nubank");
    const purchase = await s.buy({ description: "Sofa", amount: 270, date: day(-3) });
    await s.refund({
      amount: 8200,
      accountId: nubank,
      originalTransactionId: purchase.transactionId,
    });
    const cancelled = await s.mcp.call("cancel_purchase", {
      purchaseId: purchase.purchaseId,
      creditCard: "XP",
    });
    expect(cancelled.isError, cancelled.text).toBe(false);
    expect(cancelled.data.credit.amount).toBe(188);
    // The 82 already received in the bank is not credited twice: the card still owes it.
    expect(cancelled.data.owed.amount).toBe(82);
    expect(await s.moneyBack(purchase.transactionId)).toMatchObject({
      receivedBack: 27000,
      outOfPocket: 0,
    });
    await s.mcp.close();
  });

  it("exposes the link through the MCP tools", async () => {
    const s = await setup();
    const nubank = await s.makeAccount("Nubank");
    const purchase = await s.buy({ description: "Lanchonight", amount: 270, date: day(-3) });

    const preview = await s.mcp.call("create_refund", {
      reason: "split",
      amount: 82,
      account: "Nubank",
      originalTransactionId: purchase.transactionId,
      dryRun: true,
    });
    expect(preview.data.status).toBe("dry_run");
    const created = await s.mcp.call("create_refund", {
      reason: "split",
      amount: 82,
      account: "Nubank",
      description: "Split: Mario",
      originalTransactionId: purchase.transactionId,
    });
    expect(created.isError, created.text).toBe(false);
    expect(created.data.refund.refund).toMatchObject({
      reason: "split",
      originalTransactionId: purchase.transactionId,
    });

    const loose = await s.refund({ reason: "cashback", amount: 1500, accountId: nubank });
    const dry = await s.mcp.call("link_refund", {
      refundId: loose.body.data.id,
      originalTransactionId: purchase.transactionId,
      dryRun: true,
    });
    expect(dry.data).toMatchObject({ status: "dry_run", fits: true });
    expect(dry.data.outOfPocketAfter.amount).toBe(173);
    const linked = await s.mcp.call("link_refund", {
      refundId: loose.body.data.id,
      originalTransactionId: purchase.transactionId,
    });
    expect(linked.isError, linked.text).toBe(false);
    expect(linked.data.purchase.receivedBack.amount).toBe(97);

    const got = await s.mcp.call("get_transaction", { id: purchase.transactionId });
    expect(got.data.transaction.receivedBack.amount).toBe(97);
    expect(got.data.transaction.outOfPocket.amount).toBe(173);
    expect(got.data.transaction.receivedBackRows).toHaveLength(2);
    const searched = await s.mcp.call("search_transactions", { text: "Lanchonight" });
    expect(searched.data.transactions[0].outOfPocket.amount).toBe(173);

    const unlinked = await s.mcp.call("link_refund", {
      refundId: loose.body.data.id,
      originalTransactionId: null,
    });
    expect(unlinked.data.status).toBe("unlinked");
    const notRefund = await s.mcp.call("link_refund", {
      refundId: purchase.transactionId,
      originalTransactionId: purchase.transactionId,
    });
    expect(notRefund.isError).toBe(true);
    await s.mcp.close();
  });
});
