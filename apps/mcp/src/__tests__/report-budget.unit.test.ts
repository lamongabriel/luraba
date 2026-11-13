import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/connect.js";

const row = (
  id: string,
  name: string,
  parentId: string | null,
  budgeted: number,
  actual: number,
) => ({
  categoryId: id,
  categoryName: name,
  parentId,
  budgetedAmount: budgeted,
  actualAmount: actual,
});

// The Eating Out example: R$ 600.00 budget, children Restaurants 566.39 and Delivery 169.21.
const budget = {
  settings: {
    overrideCreditExpenseTiming: null,
    overrideCreditInstallmentBudgetMode: null,
    creditExpenseTiming: "spend_month",
    creditInstallmentBudgetMode: "per_installment",
    defaultCreditExpenseTiming: "spend_month",
    defaultCreditInstallmentBudgetMode: "per_installment",
  },
  month: "2026-11",
  budgetCurrencyCode: "BRL",
  displayCurrencyCode: "BRL",
  totals: { incomeBudgeted: 0, incomeActual: 0, expenseBudgeted: 60_000, expenseActual: 73_560 },
  categories: {
    income: [],
    expense: [
      row("11111111-1111-4111-8111-111111111111", "Eating Out", null, 60_000, 0),
      row(
        "22222222-1111-4111-8111-111111111111",
        "Restaurants",
        "11111111-1111-4111-8111-111111111111",
        0,
        56_639,
      ),
      row(
        "33333333-1111-4111-8111-111111111111",
        "Delivery",
        "11111111-1111-4111-8111-111111111111",
        0,
        16_921,
      ),
      row("44444444-1111-4111-8111-111111111111", "Rent", null, 100_000, 90_000),
    ],
  },
};

async function setup() {
  const fetch = async () =>
    new Response(JSON.stringify({ success: true, data: budget }), { status: 200 });
  return connectTestClient({ baseUrl: "http://api.test", apiKey: "lur_x", fetch });
}

describe("report_budget", () => {
  it("rolls subcategory spending up into the parent and nests the children", async () => {
    const { call, close } = await setup();
    const result = await call("report_budget", { month: "2026-11" });
    const lines = result.data.expenseCategories;
    expect(lines.map((l: { category: string }) => l.category)).toEqual(["Eating Out", "Rent"]);

    const eating = lines[0];
    expect(eating.actual.amount).toBe(735.6);
    expect(eating.ownActual.amount).toBe(0);
    expect(eating.remaining.amount).toBe(-135.6);
    expect(eating.overBudget).toBe(true);
    expect(eating.allocated.amount).toBe(0);
    expect(eating.unallocated.amount).toBe(600);
    expect(eating.parent).toBeNull();
    expect(eating.subcategories).toHaveLength(2);
    const delivery = eating.subcategories.find(
      (c: { category: string }) => c.category === "Delivery",
    );
    expect(delivery).toMatchObject({
      parent: { categoryId: "11111111-1111-4111-8111-111111111111", name: "Eating Out" },
    });
    expect(delivery.actual.amount).toBe(169.21);

    // Children are not counted twice in the totals.
    expect(result.data.totals.expenseActual.amount).toBe(735.6);
    await close();
  });
});
