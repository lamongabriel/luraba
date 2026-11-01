import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("budgets: credit-card settings per month", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the household default, applies a month override and goes back when cleared", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));

    const auth = await createAuthenticatedContext();
    const headers = createAuthHeaders(auth.token, auth.household.id);
    const category = await categoriesService.createCategory(
      auth.householdContext,
      buildCategoryInput({ name: "Electronics", type: "expense" }),
    );
    const owner = await createCreditCardOwner(auth.householdContext);
    const card = await creditCardsService.createCreditCard(
      auth.householdContext,
      buildCreditCardInput({ ownerAccountId: owner.id, name: "Visa", closingDay: 25, dueDay: 5 }),
    );
    await creditCardsService.createPurchase(auth.householdContext, card.id, {
      description: "Laptop",
      amount: 120_000,
      categoryId: category.id,
      purchaseDate: new Date("2026-04-20T00:00:00.000Z"),
      postedDate: new Date("2026-04-29T00:00:00.000Z"),
      installmentCount: 3,
      includeInBudget: true,
    });

    const spentIn = async (month: string) => {
      const response = await request(app).get(`/api/v1/budgets/${month}`).set(headers);
      expect(response.status).toBe(200);
      return response.body.data.totals.expenseActual as number;
    };

    // Household default: each installment counts in its statement closing month.
    expect(await spentIn("2026-05")).toBe(40_000);
    expect(await spentIn("2026-07")).toBe(40_000);

    // April override: the full purchase counts in the month after the first bill is due.
    const overridden = await request(app)
      .put("/api/v1/budgets/2026-04/settings")
      .set(headers)
      .send({
        creditExpenseTiming: "month_after_payment",
        creditInstallmentBudgetMode: "full_amount",
      });
    expect(overridden.status).toBe(200);
    expect(await spentIn("2026-05")).toBe(0);
    expect(await spentIn("2026-07")).toBe(120_000);

    // Clearing the override follows the household default again.
    const cleared = await request(app)
      .put("/api/v1/budgets/2026-04/settings")
      .set(headers)
      .send({ creditExpenseTiming: null, creditInstallmentBudgetMode: null });
    expect(cleared.body.data.settings).toMatchObject({
      overrideCreditExpenseTiming: null,
      creditExpenseTiming: "spend_month",
    });
    expect(await spentIn("2026-05")).toBe(40_000);
    expect(await spentIn("2026-07")).toBe(40_000);
  });
});

describe("budgets: insights", () => {
  it("returns the last months against their budget and the most expensive categories", async () => {
    const auth = await createAuthenticatedContext();
    const headers = createAuthHeaders(auth.token, auth.household.id);
    const account = await accountsService.createAccount(
      auth.householdContext,
      buildAccountInput({ name: "Insights Checking", type: "cash", currencyCode: "BRL" }),
    );
    const food = await categoriesService.createCategory(
      auth.householdContext,
      buildCategoryInput({ name: "Insights Food", type: "expense" }),
    );
    const rent = await categoriesService.createCategory(
      auth.householdContext,
      buildCategoryInput({ name: "Insights Rent", type: "expense" }),
    );

    const spend = (categoryId: string, amount: number, date: string) =>
      transactionsService.createTransaction(auth.householdContext, {
        type: "expense",
        description: "Insights spend",
        amount,
        currencyCode: "BRL",
        paymentMethodCode: "pix",
        accountId: account.id,
        categoryId,
        purchaseDate: new Date(`${date}T00:00:00.000Z`),
        postedDate: new Date(`${date}T00:00:00.000Z`),
      });
    await spend(food.id, 10_000, "2026-07-10");
    await spend(food.id, 12_500, "2026-08-05");
    await spend(rent.id, 80_000, "2026-08-06");

    for (const [month, amount] of [
      ["2026-07", 40_000],
      ["2026-08", 50_000],
    ] as const) {
      const saved = await request(app)
        .put(`/api/v1/budgets/${month}`)
        .set(headers)
        .send({ income: [], expense: [{ categoryId: food.id, amount }] });
      expect(saved.status).toBe(200);
    }

    const response = await request(app).get("/api/v1/budgets/2026-08/insights").set(headers);
    expect(response.status).toBe(200);

    const { history, mostExpenses } = response.body.data;
    expect(history).toHaveLength(6);
    expect(history.map((item: { month: string }) => item.month)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
    expect(history[4]).toMatchObject({ budgetedAmount: 40_000, spentAmount: 10_000 });
    expect(history[5]).toMatchObject({ budgetedAmount: 50_000, spentAmount: 92_500 });
    expect(mostExpenses).toHaveLength(2);
    expect(mostExpenses[0]).toMatchObject({
      categoryName: "Insights Rent",
      actualAmount: 80_000,
      previousAmount: 0,
      changePercent: null,
    });
    expect(mostExpenses[1]).toMatchObject({
      categoryName: "Insights Food",
      actualAmount: 12_500,
      previousAmount: 10_000,
      changePercent: 25,
    });
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/budgets/2026-08/insights");
    expect(response.status).toBe(401);
  });
});

describe("budgets: parent categories cap their subcategories", () => {
  it("counts the parent budget once and rejects subcategories that exceed it", async () => {
    const auth = await createAuthenticatedContext();
    const headers = createAuthHeaders(auth.token, auth.household.id);
    const car = await categoriesService.createCategory(
      auth.householdContext,
      buildCategoryInput({ name: "Cap Car", type: "expense" }),
    );
    const oil = await categoriesService.createCategory(
      auth.householdContext,
      buildCategoryInput({ name: "Cap Oil", type: "expense", parentId: car.id }),
    );
    const insurance = await categoriesService.createCategory(
      auth.householdContext,
      buildCategoryInput({ name: "Cap Insurance", type: "expense", parentId: car.id }),
    );
    const put = (expense: Array<{ categoryId: string; amount: number }>) =>
      request(app).put("/api/v1/budgets/2026-09").set(headers).send({ income: [], expense });

    const ok = await put([
      { categoryId: car.id, amount: 50_000 },
      { categoryId: oil.id, amount: 9_000 },
      { categoryId: insurance.id, amount: 40_000 },
    ]);
    expect(ok.status).toBe(200);
    // The subcategories are inside the parent budget, not on top of it.
    expect(ok.body.data.totals.expenseBudgeted).toBe(50_000);

    const tooMuch = await put([
      { categoryId: car.id, amount: 50_000 },
      { categoryId: oil.id, amount: 20_000 },
      { categoryId: insurance.id, amount: 40_000 },
    ]);
    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.error.message).toContain("Cap Car");

    // Without a parent budget the subcategories are free-standing.
    const free = await put([{ categoryId: oil.id, amount: 20_000 }]);
    expect(free.status).toBe(200);
    expect(free.body.data.totals.expenseBudgeted).toBe(20_000);
  });
});
