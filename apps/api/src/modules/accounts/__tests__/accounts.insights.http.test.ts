import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import * as accountsService from "@/modules/accounts/accounts.service";
import * as categoriesService from "@/modules/categories/categories.service";
import * as transactionsService from "@/modules/transactions/transactions.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildAccountInput, buildCategoryInput } from "@/test/factories";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("GET /api/v1/accounts/:id/insights", () => {
  it("summarises money in, out, spent, categories and the balance history", async () => {
    const context = await createAuthenticatedContext();
    const account = await accountsService.createAccount(context.householdContext, {
      ...buildAccountInput({ name: "Insights Checking", type: "cash", currencyCode: "BRL" }),
      openingBalance: 100_000,
      balanceAsOfDate: "2026-02-01",
    });
    const food = await categoriesService.createCategory(
      context.householdContext,
      buildCategoryInput({ name: "Insights Food", type: "expense" }),
    );

    await transactionsService.createTransaction(context.householdContext, {
      type: "expense",
      description: "Insights Market",
      amount: 12_500,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: account.id,
      categoryId: food.id,
      purchaseDate: day("2026-03-05"),
      postedDate: day("2026-03-05"),
    });
    await transactionsService.createTransaction(context.householdContext, {
      type: "income",
      description: "Insights Salary",
      amount: 50_000,
      currencyCode: "BRL",
      paymentMethodCode: "pix",
      accountId: account.id,
      purchaseDate: day("2026-03-10"),
      postedDate: day("2026-03-10"),
    });

    const response = await request(app)
      .get(`/api/v1/accounts/${account.id}/insights`)
      .set(createAuthHeaders(context.token, context.household.id))
      .query({ dateFrom: "2026-03-01", dateTo: "2026-03-31" });

    expect(response.status).toBe(200);
    const insights = response.body.data;
    expect(insights.currencyCode).toBe("BRL");
    expect(insights.bucket).toBe("day");
    expect(insights.balance).toEqual({ opening: 100_000, closing: 137_500 });
    expect(insights.totals).toMatchObject({
      moneyIn: 50_000,
      moneyOut: 12_500,
      net: 37_500,
      totalSpent: 12_500,
      transactionCount: 2,
      savingsRate: 75,
      largestExpense: { description: "Insights Market", amount: 12_500, date: "2026-03-05" },
    });
    expect(insights.categories).toEqual([
      expect.objectContaining({ id: food.id, amount: 12_500, percentage: 100 }),
    ]);
    expect(insights.balanceHistory).toHaveLength(31);
    expect(insights.balanceHistory[4]).toEqual({ date: "2026-03-05", balance: 87_500 });
    expect(insights.balanceHistory[30]).toEqual({ date: "2026-03-31", balance: 137_500 });
    expect(insights.cashFlow[9]).toEqual({ date: "2026-03-10", moneyIn: 50_000, moneyOut: 0 });
    // The opening-balance adjustment sits in February, which has an entry, so it is comparable.
    expect(insights.previous).toEqual({ moneyIn: 0, moneyOut: 0, net: 0, totalSpent: 0 });
  });

  it("is household scoped and validates the range", async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();
    const account = await accountsService.createAccount(
      owner.householdContext,
      buildAccountInput({ name: "Private Insights", type: "cash", currencyCode: "BRL" }),
    );

    const hidden = await request(app)
      .get(`/api/v1/accounts/${account.id}/insights`)
      .set(createAuthHeaders(outsider.token, outsider.household.id));
    expect(hidden.status).toBe(404);

    const reversed = await request(app)
      .get(`/api/v1/accounts/${account.id}/insights`)
      .set(createAuthHeaders(owner.token, owner.household.id))
      .query({ dateFrom: "2026-03-31", dateTo: "2026-03-01" });
    expect(reversed.status).toBe(422);

    const anonymous = await request(app).get(`/api/v1/accounts/${account.id}/insights`);
    expect(anonymous.status).toBe(401);
  });
});
