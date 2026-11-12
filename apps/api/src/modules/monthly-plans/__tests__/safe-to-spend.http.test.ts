import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import {
  buildAccountInput,
  buildCategoryInput,
  buildCreditCardInput,
  createCreditCardOwner,
} from "@/test/factories";

/** "Today" is Nov 12, 2026: this month is 2026-11, next month 2026-12. */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T15:00:00.000Z"));
});
afterEach(() => vi.useRealTimers());

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function setup() {
  const context = await createAuthenticatedContext({ role: "owner" });
  const headers = createAuthHeaders(context.token, context.household.id);
  const household = context.householdContext;
  const account = (
    name: string,
    currencyCode: string,
    subtype: "checking" | "savings" = "checking",
  ) =>
    accountsService.createAccount(
      household,
      buildAccountInput({ name, type: "cash", details: { kind: "cash", subtype }, currencyCode }),
    );
  const income = await categoriesService.createCategory(
    household,
    buildCategoryInput({ name: "Other Income", type: "income" }),
  );
  const groceries = await categoriesService.createCategory(
    household,
    buildCategoryInput({ name: "Groceries", type: "expense" }),
  );
  const deposit = (accountId: string, amount: number, currencyCode = "USD") =>
    transactionsService.createTransaction(household, {
      type: "income",
      description: "Deposit",
      amount,
      currencyCode,
      paymentMethodCode: "cash",
      accountId,
      categoryId: income.id,
      purchaseDate: day("2026-11-01"),
      postedDate: day("2026-11-01"),
    });
  const get = async (month?: string) => {
    const response = await request(app)
      .get("/api/v1/monthly-plans/safe-to-spend")
      .query(month ? { month } : {})
      .set(headers);
    expect(response.status).toBe(200);
    return response.body.data;
  };
  const goal = async (name: string, monthly: number, currencyCode = "USD") => {
    const response = await request(app)
      .post("/api/v1/goals")
      .set(headers)
      .send({
        name,
        kind: "savings",
        currencyCode,
        monthlyContribution: monthly,
        targetAmount: monthly * 12,
        startDate: "2026-11-01",
        endMonth: "2027-11",
      });
    expect(response.status).toBe(201);
    return response.body.data.id as string;
  };
  const bill = (name: string, amount: number, dayOfMonth: number, currencyCode = "USD") =>
    request(app).post("/api/v1/bills").set(headers).send({
      name,
      expectedAmount: amount,
      currencyCode,
      frequency: "monthly",
      dayOfMonth,
      startDate: "2026-11-01",
    });
  const card = async (currencyCode = "USD") => {
    const owner = await createCreditCardOwner(household, { currencyCode });
    return creditCardsService.createCreditCard(
      household,
      buildCreditCardInput({ ownerAccountId: owner.id, name: "Visa", closingDay: 25, dueDay: 5 }),
    );
  };
  const purchase = (cardId: string, amount: number, on: string) =>
    creditCardsService.createPurchase(household, cardId, {
      description: "Purchase",
      amount,
      purchaseDate: day(on),
      postedDate: day(on),
      installmentCount: 1,
    });
  return { household, headers, account, deposit, get, goal, bill, card, purchase, groceries };
}

const usd = (group: { currencyCode: string }[], code = "USD") =>
  group.find((item) => item.currencyCode === code) as {
    currencyCode: string;
    thisMonth: Record<string, number | null>;
    nextMonth: Record<string, number | null>;
    bills: unknown[];
    invoices: unknown[];
    goals: unknown[];
  };

describe("GET /monthly-plans/safe-to-spend", () => {
  it("subtracts unpaid bills and goal contributions still owed from the balance", async () => {
    const t = await setup();
    const checking = await t.account("Checking", "USD");
    await t.deposit(checking.id, 200_000);
    await t.goal("Honeymoon", 30_000);
    await t.bill("Internet", 10_000, 20);

    const data = await t.get();
    const group = usd(data.currencies);
    expect(data.month).toBe("2026-11");
    expect(data.nextMonth).toBe("2026-12");
    expect(group.thisMonth).toMatchObject({
      spendableBalance: 200_000,
      billsRemaining: 10_000,
      goalsOwed: 30_000,
      invoicesDue: 0,
      leftToSpend: 160_000,
    });
    // No plan: next month has no projected income, so there is nothing to compare against.
    expect(group.nextMonth).toMatchObject({
      bills: 10_000,
      goals: 30_000,
      commitments: 40_000,
      projectedIncome: null,
      leftForCard: null,
    });
  });

  it("leaves everything spendable when goals are met and bills are paid", async () => {
    const t = await setup();
    const checking = await t.account("Checking", "USD");
    await t.deposit(checking.id, 150_000);
    const goalId = await t.goal("Furniture", 25_000);
    const contributed = await request(app)
      .post(`/api/v1/goals/${goalId}/contributions`)
      .set(t.headers)
      .send({ amount: 25_000, contributedOn: "2026-11-05" });
    expect(contributed.status).toBe(201);

    const group = usd((await t.get()).currencies);
    expect(group.thisMonth).toMatchObject({
      goalsOwed: 0,
      billsRemaining: 0,
      leftToSpend: 150_000,
    });
    expect(group.goals).toEqual([
      expect.objectContaining({
        planned: 25_000,
        contributed: 25_000,
        owed: 0,
        nextPlanned: 25_000,
      }),
    ]);
  });

  it("counts an unpaid invoice due this month and card charges billed next month", async () => {
    const t = await setup();
    const checking = await t.account("Checking", "USD");
    await t.deposit(checking.id, 300_000);
    const card = await t.card("USD");
    // Closes Oct 25, due Nov 5: still unpaid, so cash owed this month.
    await t.purchase(card.id, 50_000, "2026-10-10");
    // Closes Nov 25, due Dec 5: billed next month.
    await t.purchase(card.id, 20_000, "2026-11-10");

    const group = usd((await t.get()).currencies);
    expect(group.thisMonth).toMatchObject({ invoicesDue: 50_000, leftToSpend: 250_000 });
    expect(group.nextMonth).toMatchObject({ cardCharged: 20_000, commitments: 20_000 });
  });

  it("projects next month's income from the monthly plan, net of taxes", async () => {
    const t = await setup();
    const checking = await t.account("Checking", "USD");
    await t.deposit(checking.id, 100_000);
    const goalId = await t.goal("Honeymoon", 100_000);
    await t.bill("Rent", 50_000, 15);
    const card = await t.card("USD");
    await t.purchase(card.id, 30_000, "2026-11-10");
    const plan = await request(app)
      .put("/api/v1/monthly-plans")
      .set(t.headers)
      .send({
        from: "2026-12",
        currencyCode: "USD",
        lines: [
          { kind: "salary", amount: 500_000 },
          { kind: "taxes", amount: 50_000 },
          { kind: "goal", goalId, amount: 100_000 },
        ],
      });
    expect(plan.status).toBe(200);

    const group = usd((await t.get()).currencies);
    // 5,000 - 500 taxes = 4,500; commitments 500 rent + 1,000 goal + 300 card.
    expect(group.nextMonth).toMatchObject({
      projectedIncome: 450_000,
      commitments: 180_000,
      leftForCard: 270_000,
    });
  });

  it("keeps goal money out of the spendable balance and highlights overspent budgets", async () => {
    const t = await setup();
    const checking = await t.account("Checking", "USD");
    const piggy = await t.account("Goal checking", "USD");
    const savings = await t.account("Piggy bank", "USD", "savings");
    await t.deposit(savings.id, 77_000);
    await t.deposit(checking.id, 140_000);
    const goalId = await t.goal("Honeymoon", 10_000);
    const contributed = await request(app)
      .post(`/api/v1/goals/${goalId}/contribute`)
      .set(t.headers)
      .send({
        amount: 40_000,
        contributedOn: "2026-11-02",
        fromAccountId: checking.id,
        toAccountId: piggy.id,
      });
    expect(contributed.status).toBe(201);

    await request(app)
      .put("/api/v1/budgets/2026-11")
      .set(t.headers)
      .send({ expense: [{ categoryId: t.groceries.id, amount: 10_000 }] });
    await transactionsService.createTransaction(t.household, {
      type: "expense",
      description: "Market",
      amount: 15_000,
      currencyCode: "USD",
      paymentMethodCode: "cash",
      accountId: checking.id,
      categoryId: t.groceries.id,
      purchaseDate: day("2026-11-03"),
      postedDate: day("2026-11-03"),
    });

    const data = await t.get();
    const group = usd(data.currencies);
    // 1,000 + 400 - 150 groceries = 1,250 in the two checking accounts; 400 is goal money; the savings account (770) is not spendable at all.
    expect(group.thisMonth).toMatchObject({
      accountsBalance: 125_000,
      goalFundsHeld: 40_000,
      spendableBalance: 85_000,
      goalsOwed: 0,
      leftToSpend: 85_000,
    });
    // Budgets are guidance in the budget currency (the USD expense is converted), not part of the maths.
    expect(data.budgets.overspent).toHaveLength(1);
    expect(data.budgets.overspent[0]).toMatchObject({
      categoryName: "Groceries",
      budgeted: 10_000,
    });
    expect(data.budgets.overspent[0].actual).toBeGreaterThan(10_000);
  });

  it("never mixes currencies", async () => {
    const t = await setup();
    const usdAccount = await t.account("US checking", "USD");
    const brlAccount = await t.account("BR checking", "BRL");
    await t.deposit(usdAccount.id, 100_000, "USD");
    await t.deposit(brlAccount.id, 500_000, "BRL");
    await t.goal("Investments Brazil", 200_000, "BRL");
    await t.goal("Investments USA", 20_000, "USD");
    await t.bill("Light", 30_000, 18, "BRL");

    const data = await t.get();
    expect(data.currencies.map((item: { currencyCode: string }) => item.currencyCode)).toEqual([
      "BRL",
      "USD",
    ]);
    expect(usd(data.currencies, "BRL").thisMonth).toMatchObject({
      spendableBalance: 500_000,
      billsRemaining: 30_000,
      goalsOwed: 200_000,
      leftToSpend: 270_000,
    });
    expect(usd(data.currencies, "USD").thisMonth).toMatchObject({
      spendableBalance: 100_000,
      billsRemaining: 0,
      goalsOwed: 20_000,
      leftToSpend: 80_000,
    });
  });

  it("rejects another household's data by scoping everything to the caller", async () => {
    const t = await setup();
    const other = await setup();
    const checking = await other.account("Checking", "USD");
    await other.deposit(checking.id, 999_999);
    expect((await t.get()).currencies).toEqual([]);
  });
});
