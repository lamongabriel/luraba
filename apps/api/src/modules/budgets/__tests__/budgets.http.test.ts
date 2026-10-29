import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "@/app";
import * as categoriesService from "@/modules/categories/categories.service";
import * as creditCardsService from "@/modules/credit-cards/credit-cards.service";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildCategoryInput, buildCreditCardInput, createCreditCardOwner } from "@/test/factories";

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
