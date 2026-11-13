import { describe, expect, it } from "vitest";
import type { InsightInstallmentRow } from "../credit-card-insights.repository";
import { buildInsightsGroup, combineCategories } from "../credit-card-insights.service";

function row(overrides: Partial<InsightInstallmentRow>): InsightInstallmentRow {
  return {
    currencyCode: "USD",
    dueMonth: "2026-05",
    amount: 1000,
    installmentCount: 1,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    ...overrides,
  };
}

describe("buildInsightsGroup", () => {
  it("totals the month, compares with the previous one and looks ahead", () => {
    const rows = [
      row({ dueMonth: "2026-04", amount: 4000 }),
      row({ dueMonth: "2026-05", amount: 1700 }),
      row({ dueMonth: "2026-05", amount: 9000, installmentCount: 3 }),
      row({ dueMonth: "2026-06", amount: 9000, installmentCount: 3 }),
      row({ dueMonth: "2026-06", amount: 500 }),
    ];

    const group = buildInsightsGroup("USD", rows, "2026-05");

    expect(group.total).toBe(10_700);
    expect(group.previousTotal).toBe(4_000);
    expect(group.upcomingInstallments[0]).toEqual({ month: "2026-06", amount: 9000 });
    expect(group.history).toHaveLength(6);
    expect(group.history.at(-1)).toEqual({ month: "2026-05", amount: 10_700 });
  });

  it("groups the month by category, biggest first, with uncategorized last resort name", () => {
    const rows = [
      row({ categoryId: "c1", categoryName: "Food", categoryColor: "#ff0000", amount: 3000 }),
      row({ categoryId: "c1", categoryName: "Food", categoryColor: "#ff0000", amount: 3000 }),
      row({ amount: 500 }),
      row({ dueMonth: "2026-04", categoryId: "c2", categoryName: "Gas", amount: 9999 }),
    ];

    const group = buildInsightsGroup("USD", rows, "2026-05");

    expect(group.byCategory).toEqual([
      { categoryId: "c1", name: "Food", color: "#ff0000", amount: 6000 },
      { categoryId: null, name: "Uncategorized", color: null, amount: 500 },
    ]);
  });
});

describe("combineCategories", () => {
  it("adds the same category across currencies in the base currency, largest first", () => {
    const usd = buildInsightsGroup(
      "USD",
      [
        row({
          amount: 1000,
          categoryId: "11111111-1111-4111-8111-111111111111",
          categoryName: "Food",
        }),
        row({
          amount: 5000,
          categoryId: "22222222-2222-4222-8222-222222222222",
          categoryName: "Travel",
        }),
      ],
      "2026-05",
    );
    const eur = buildInsightsGroup(
      "EUR",
      [
        row({
          currencyCode: "EUR",
          amount: 1000,
          categoryId: "11111111-1111-4111-8111-111111111111",
          categoryName: "Food",
        }),
      ],
      "2026-05",
    );
    const fx = {
      baseCurrencyCode: "USD",
      basePrecision: 2,
      asOf: "2026-05-01",
      rates: [
        {
          currencyCode: "EUR",
          precision: 2,
          rate: 2,
          rateNumerator: 2,
          rateDenominator: 1,
          rateDate: "2026-05-01",
          source: "manual",
        },
      ],
      missingCurrencies: [],
    } as Parameters<typeof combineCategories>[0];

    const result = combineCategories(fx, [usd, eur]);

    expect(result.map((item) => [item.name, item.amount.total])).toEqual([
      ["Travel", 5000],
      ["Food", 3000],
    ]);
  });
});
