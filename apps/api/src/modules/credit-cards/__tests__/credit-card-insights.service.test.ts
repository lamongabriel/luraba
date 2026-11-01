import { describe, expect, it } from "vitest";
import type { InsightInstallmentRow } from "../credit-card-insights.repository";
import { buildInsightsGroup } from "../credit-card-insights.service";

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
