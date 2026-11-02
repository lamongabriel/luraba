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
 * Refunds, cancellations, chargebacks and cashback: credits with no source account that net against
 * the original category, restore card credit, lower the invoice and never count as income.
 */
describe("refunds and credits", () => {
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
      .send({ name: "refunds" });
    const mcp = await connectTestClient({ baseUrl, apiKey: key.body.data.secret });
    const owner = await request(app)
      .post("/api/v1/accounts")
      .set(headers)
      .send(buildAccountInput({ name: "Inter", currencyCode: "BRL", openingBalance: 100000 }));
    expect(owner.status).toBe(201);
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
    const accountId = owner.body.data.id as string;

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
    const cardInfo = async () => (await get(`credit-cards/${card.id}`)).data;
    const breakdown = async () => {
      const body = await get(`transactions/analytics?dateFrom=${day(-400)}&dateTo=${day(400)}`);
      return Object.fromEntries(
        (body.data.expenseBreakdown.items as { name: string; amount: number }[]).map((item) => [
          item.name,
          item.amount,
        ]),
      ) as Record<string, number>;
    };
    const summary = async () =>
      (await get(`transactions?dateFrom=${day(-400)}&dateTo=${day(400)}&perPage=100`)).meta
        .summary as { incomeAmount: number; expenseAmount: number };
    const refund = (input: Record<string, unknown>) =>
      post("transactions", {
        type: "refund",
        purchaseDate: day(0),
        postedDate: day(0),
        ...input,
      });
    return { mcp, headers, card, accountId, get, post, buy, cardInfo, breakdown, summary, refund };
  }

  it("partial refund on a card purchase nets the category and leaves income alone", async () => {
    const s = await setup();
    const purchase = await s.buy({
      description: "Bela Ferraz",
      amount: 79.98,
      category: "Gifts & Donations > Louise Gifts",
      date: day(-1),
    });
    const used = (await s.cardInfo()).balance as number;
    const response = await s.refund({
      description: "Refund: Bela Ferraz",
      amount: 2000,
      reason: "refund",
      creditCardId: s.card.id,
      originalTransactionId: purchase.transactionId,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data.refund).toMatchObject({
      reason: "refund",
      creditCardId: s.card.id,
      originalTransactionId: purchase.transactionId,
    });
    expect(response.body.data.refund.billingCycleId).toBeTruthy();
    expect(response.body.data.categoryId).toBeTruthy();

    expect(((await s.cardInfo()).balance as number) - used).toBe(-2000);
    expect((await s.breakdown())["Louise Gifts"]).toBe(5998);
    const totals = await s.summary();
    expect(totals.incomeAmount).toBe(0);
    expect(totals.expenseAmount).toBe(5998);

    const tooMuch = await s.refund({
      description: "Too much",
      amount: 6000,
      reason: "refund",
      creditCardId: s.card.id,
      originalTransactionId: purchase.transactionId,
    });
    expect(tooMuch.status).toBe(422);
    await s.mcp.close();
  });

  it("a chargeback of the full amount takes the purchase out of its category", async () => {
    const s = await setup();
    const purchase = await s.buy({
      description: "YouTube Premium",
      amount: 26.9,
      category: "Streaming",
      date: day(-2),
    });
    const response = await s.refund({
      description: "Chargeback: YouTube Premium",
      amount: 2690,
      reason: "chargeback",
      creditCardId: s.card.id,
      originalTransactionId: purchase.transactionId,
    });
    expect(response.status).toBe(201);
    expect((await s.breakdown()).Streaming ?? 0).toBe(0);
    expect((await s.cardInfo()).balance).toBe(0);
    await s.mcp.close();
  });

  it("unlinked cashback reduces total spending under its own category, never income", async () => {
    const s = await setup();
    await s.buy({ description: "Groceries", amount: 100, category: "Food", date: day(-1) });
    const category = await s.mcp.call("create_category", {
      name: "Cashback & Rewards",
      type: "expense",
    });
    expect(category.isError, category.text).toBe(false);
    const response = await s.refund({
      description: "Card cashback",
      amount: 1500,
      reason: "cashback",
      creditCardId: s.card.id,
      categoryId: category.data.category.id,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    const totals = await s.summary();
    expect(totals.expenseAmount).toBe(8500);
    expect(totals.incomeAmount).toBe(0);
    expect((await s.breakdown())["Cashback & Rewards"]).toBe(-1500);
    await s.mcp.close();
  });

  it("refunds a debit expense to its bank account without a source account", async () => {
    const s = await setup();
    const expense = await s.mcp.call("create_transaction", {
      kind: "expense",
      description: "Pix: Mike",
      amount: 50,
      account: "Inter",
      category: "Shopping",
      createMissing: true,
      date: day(-1),
    });
    expect(expense.isError, expense.text).toBe(false);
    const before = (await s.get(`accounts/${s.accountId}`)).data.balance as number;
    const response = await s.refund({
      description: "Refund: Pix",
      amount: 5000,
      reason: "refund",
      accountId: s.accountId,
      originalTransactionId: expense.data.transaction.id,
    });
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(((await s.get(`accounts/${s.accountId}`)).data.balance as number) - before).toBe(5000);
    expect((await s.breakdown()).Shopping ?? 0).toBe(0);
    expect((await s.summary()).incomeAmount).toBe(0);
    await s.mcp.close();
  });

  it("cancels an installment purchase as a single credit or by dropping future installments", async () => {
    const s = await setup();
    const date = day(-45);
    const single = await s.buy({
      description: "Sofa single",
      amount: 1000,
      installments: 10,
      category: "Home",
      date,
    });
    const futureMode = await s.buy({
      description: "Sofa future",
      amount: 1000,
      installments: 10,
      category: "Home",
      date,
    });
    const used = (await s.cardInfo()).balance as number;
    expect(used).toBe(200000);

    const dropped = await s.post(
      `credit-cards/${s.card.id}/purchases/${futureMode.purchaseId}/cancel`,
      { mode: "cancel_future" },
    );
    expect(dropped.status, JSON.stringify(dropped.body)).toBe(200);
    const kept = dropped.body.data.purchase.installments as { amount: number }[];
    expect(kept.length).toBeLessThan(10);
    expect(dropped.body.data.refund.amount).toBe(kept.reduce((sum, item) => sum + item.amount, 0));
    expect((await s.cardInfo()).balance).toBe(100000);

    const credited = await s.post(
      `credit-cards/${s.card.id}/purchases/${single.purchaseId}/cancel`,
      {
        mode: "single_credit",
      },
    );
    expect(credited.status, JSON.stringify(credited.body)).toBe(200);
    expect(credited.body.data.refund.amount).toBe(100000);
    expect(credited.body.data.purchase.installmentCount).toBe(10);
    expect((await s.cardInfo()).balance).toBe(0);

    const again = await s.post(`credit-cards/${s.card.id}/purchases/${single.purchaseId}/cancel`, {
      mode: "single_credit",
    });
    expect(again.status).toBe(422);
    await s.mcp.close();
  });

  it("dropping future installments leaves the category at zero once the billed part is credited", async () => {
    const s = await setup();
    const purchase = await s.buy({
      description: "Washer",
      amount: 600,
      installments: 6,
      category: "Appliances",
      date: day(-45),
    });
    const response = await s.post(
      `credit-cards/${s.card.id}/purchases/${purchase.purchaseId}/cancel`,
      { mode: "cancel_future" },
    );
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect((await s.cardInfo()).balance).toBe(0);
    expect((await s.breakdown()).Appliances ?? 0).toBe(0);
    expect((await s.summary()).incomeAmount).toBe(0);
    await s.mcp.close();
  });

  it("deleting a card credit puts the amount back on the invoice", async () => {
    const s = await setup();
    const purchase = await s.buy({ description: "Shoes", amount: 200, date: day(-1) });
    const response = await s.refund({
      description: "Refund: Shoes",
      amount: 20000,
      reason: "refund",
      creditCardId: s.card.id,
      originalTransactionId: purchase.transactionId,
    });
    expect((await s.cardInfo()).balance).toBe(0);
    const removed = await request(app)
      .delete(`/api/v1/transactions/${response.body.data.id}`)
      .set(s.headers);
    expect(removed.status).toBe(204);
    expect((await s.cardInfo()).balance).toBe(20000);
    await s.mcp.close();
  });

  it("records refunds, cancellations and bill payments through the MCP tools", async () => {
    const s = await setup();
    const purchase = await s.mcp.call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Bela Ferraz",
      amount: 79.98,
      creditCard: "XP",
      category: "Gifts & Donations > Louise Gifts",
      createMissing: true,
      date: day(-1),
    });
    expect(purchase.isError, purchase.text).toBe(false);
    const purchaseTransactionId = purchase.data.purchase.transactionId as string;

    const preview = await s.mcp.call("create_refund", {
      reason: "refund",
      amount: 20,
      originalTransactionId: purchaseTransactionId,
      dryRun: true,
    });
    expect(preview.data.status).toBe("dry_run");

    const refund = await s.mcp.call("create_refund", {
      reason: "refund",
      amount: 20,
      originalTransactionId: purchaseTransactionId,
    });
    expect(refund.isError, refund.text).toBe(false);
    expect(refund.data.refund).toMatchObject({
      type: "refund",
      category: "Louise Gifts",
      refund: { reason: "refund", originalTransactionId: purchaseTransactionId },
    });
    expect(refund.data.refund.amount.amount).toBe(20);
    expect(refund.data.invoice.total.amount).toBeCloseTo(59.98, 2);
    expect(refund.data.remainingCredit.amount).toBeCloseTo(50000 - 59.98, 2);

    const spending = await s.mcp.call("report_spending", {
      groupBy: "category",
      period: "custom",
      dateFrom: day(-400),
      dateTo: day(0),
    });
    const groups = spending.data.groups as { name: string; amount: { amount: number } }[];
    expect(groups.find((group) => group.name === "Louise Gifts")?.amount.amount).toBeCloseTo(
      59.98,
      2,
    );

    const searched = await s.mcp.call("search_transactions", { types: ["refund"] });
    expect(searched.data.transactions).toHaveLength(1);

    const payment = await s.mcp.call("create_credit_card_payment", {
      creditCard: "XP",
      amount: 59.98,
      fromAccount: "Inter",
    });
    expect(payment.isError, payment.text).toBe(false);
    expect(payment.data.owed.amount).toBe(0);
    const income = await s.mcp.call("report_income_expense", {
      period: "custom",
      dateFrom: day(-400),
      dateTo: day(0),
    });
    expect(income.data.income.value.amount).toBe(0);

    const installment = await s.mcp.call("create_transaction", {
      kind: "credit_card_purchase",
      description: "Sofa",
      amount: 1000,
      installments: 10,
      creditCard: "XP",
      date: day(-45),
    });
    const purchaseId = installment.data.purchase.purchaseId as string;
    const cancelled = await s.mcp.call("cancel_purchase", {
      purchaseId,
      creditCard: "XP",
      mode: "cancel_future",
    });
    expect(cancelled.isError, cancelled.text).toBe(false);
    expect(cancelled.data.owed.amount).toBe(0);
    await s.mcp.close();
  });
});
