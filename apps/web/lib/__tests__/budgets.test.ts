import { describe, expect, it } from "vitest";
import {
  budgetProgressPercent,
  budgetRowRemaining,
  buildReplaceBudgetBody,
  orderBudgetRows,
} from "../budgets";

const row = (categoryId: string, categoryName: string, parentId: string | null = null) => ({
  categoryId,
  categoryName,
  parentId,
});

describe("budget helpers", () => {
  it("measures what is left in a row", () => {
    expect(budgetRowRemaining(50_000, 20_000)).toBe(30_000);
    expect(budgetRowRemaining(50_000, 70_000)).toBe(-20_000);
  });

  it("caps the progress bar and treats unplanned activity as full", () => {
    expect(budgetProgressPercent(10_000, 2_500)).toBe(25);
    expect(budgetProgressPercent(10_000, 30_000)).toBe(100);
    expect(budgetProgressPercent(0, 500)).toBe(100);
    expect(budgetProgressPercent(0, 0)).toBe(0);
  });

  it("puts sub-categories right under their parent and keeps orphans on their own", () => {
    const ordered = orderBudgetRows([
      row("c", "Coffee", "f"),
      row("g", "Gym"),
      row("f", "Food"),
      row("x", "Apples", "missing"),
    ]);
    expect(ordered.map((item) => [item.row.categoryName, item.depth])).toEqual([
      ["Apples", 0],
      ["Food", 0],
      ["Coffee", 1],
      ["Gym", 0],
    ]);
  });

  it("builds the replace body from the typed amounts and drops empty ones", () => {
    const body = buildReplaceBudgetBody(
      { income: { salary: "30000" }, expense: { rent: "1200.5", food: "", empty: "0" } },
      (major) => Math.round(major * 100),
    );
    expect(body).toEqual({
      income: [{ categoryId: "salary", amount: 3_000_000 }],
      expense: [{ categoryId: "rent", amount: 120_050 }],
    });
  });
});
