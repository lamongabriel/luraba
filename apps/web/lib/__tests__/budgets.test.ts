import { describe, expect, it } from "vitest";
import {
  type BudgetRow,
  budgetAllocation,
  budgetPace,
  budgetProgressPercent,
  budgetRowRemaining,
  budgetStatus,
  budgetToReplaceBody,
  buildBudgetItems,
  expenseBudgetTotal,
  filterAndSortBudgetRows,
  replaceBodyWithExpense,
  visibleBudgetRows,
  withCategoryBudget,
} from "../budgets";

const row = (name: string, budgetedAmount: number, actualAmount: number): BudgetRow => ({
  categoryId: name.toLowerCase(),
  categoryName: name,
  parentId: null,
  budgetedAmount,
  actualAmount,
});

describe("budget helpers", () => {
  it("measures what is left in a row", () => {
    expect(budgetRowRemaining(50_000, 20_000)).toBe(30_000);
    expect(budgetRowRemaining(50_000, 70_000)).toBe(-20_000);
  });

  it("caps the progress and treats unplanned spending as full", () => {
    expect(budgetProgressPercent(10_000, 2_500)).toBe(25);
    expect(budgetProgressPercent(10_000, 30_000)).toBe(100);
    expect(budgetProgressPercent(0, 500)).toBe(100);
    expect(budgetProgressPercent(0, 0)).toBe(0);
  });

  it("names the status from how much of the budget is spent", () => {
    expect(budgetStatus(10_000, 7_900)).toBe("on_track");
    expect(budgetStatus(10_000, 8_000)).toBe("needs_attention");
    expect(budgetStatus(10_000, 10_000)).toBe("needs_attention");
    expect(budgetStatus(10_000, 10_001)).toBe("over");
    expect(budgetStatus(0, 500)).toBe("no_budget");
    expect(budgetStatus(0, 0)).toBe("on_track");
  });

  it("lists only categories with a budget or spending", () => {
    expect(
      visibleBudgetRows([row("Food", 100, 0), row("Gym", 0, 0), row("Fun", 0, 50)]),
    ).toHaveLength(2);
  });

  it("filters by status and sorts without mutating the input", () => {
    const rows = [
      row("Food", 10_000, 9_000),
      row("Rent", 50_000, 10_000),
      row("Fun", 5_000, 9_000),
    ];
    const copy = [...rows];
    expect(filterAndSortBudgetRows(rows, "all", "name").map((r) => r.categoryName)).toEqual([
      "Food",
      "Fun",
      "Rent",
    ]);
    expect(filterAndSortBudgetRows(rows, "all", "used").map((r) => r.categoryName)).toEqual([
      "Fun",
      "Food",
      "Rent",
    ]);
    expect(filterAndSortBudgetRows(rows, "all", "budget").map((r) => r.categoryName)).toEqual([
      "Rent",
      "Food",
      "Fun",
    ]);
    expect(filterAndSortBudgetRows(rows, "over", "name").map((r) => r.categoryName)).toEqual([
      "Fun",
    ]);
    expect(rows).toEqual(copy);
  });
});

describe("budgetPace", () => {
  it("counts today and projects the month from the pace so far", () => {
    const pace = budgetPace({
      month: "2026-04",
      today: "2026-04-10",
      budgeted: 300_000,
      spent: 100_000,
    });
    expect(pace).toMatchObject({
      daysInMonth: 30,
      daysLeft: 21,
      perDayLeft: Math.round(200_000 / 21),
      projectedSpend: 300_000,
      phase: "current",
    });
  });

  it("has no allowance for a past month and no projection for a future one", () => {
    expect(
      budgetPace({ month: "2026-03", today: "2026-04-10", budgeted: 1, spent: 1 }),
    ).toMatchObject({
      daysLeft: 0,
      perDayLeft: null,
      projectedSpend: null,
      phase: "past",
    });
    expect(
      budgetPace({ month: "2026-05", today: "2026-04-10", budgeted: 31_000, spent: 0 }),
    ).toMatchObject({
      daysLeft: 31,
      perDayLeft: 1_000,
      projectedSpend: null,
      phase: "future",
    });
  });

  it("never allows a negative amount per day once over budget", () => {
    expect(
      budgetPace({ month: "2026-04", today: "2026-04-10", budgeted: 1_000, spent: 5_000 })
        .perDayLeft,
    ).toBe(0);
  });
});

describe("saving a category budget", () => {
  const budget = {
    categories: {
      income: [row("Salary", 300_000, 0)],
      expense: [row("Food", 10_000, 0), row("Rent", 50_000, 0), row("Empty", 0, 20)],
    },
  };

  it("sends back every row with a budget", () => {
    expect(budgetToReplaceBody(budget)).toEqual({
      income: [{ categoryId: "salary", amount: 300_000 }],
      expense: [
        { categoryId: "food", amount: 10_000 },
        { categoryId: "rent", amount: 50_000 },
      ],
    });
  });

  it("changes, adds and removes one expense budget and keeps the rest, income included", () => {
    expect(replaceBodyWithExpense(budget, "food", 12_000).expense).toEqual([
      { categoryId: "rent", amount: 50_000 },
      { categoryId: "food", amount: 12_000 },
    ]);
    expect(replaceBodyWithExpense(budget, "empty", 700).expense).toHaveLength(3);
    expect(replaceBodyWithExpense(budget, "rent", 0).expense).toEqual([
      { categoryId: "food", amount: 10_000 },
    ]);
    expect(replaceBodyWithExpense(budget, "rent", 0).income).toEqual([
      { categoryId: "salary", amount: 300_000 },
    ]);
  });
});

describe("grouping and allocation", () => {
  it("builds one group per parent that has subcategories and counts the parent once", () => {
    const categories = [
      { id: "car", name: "Car", parentId: null, type: "expense" },
      { id: "oil", name: "Oil", parentId: "car", type: "expense" },
      { id: "tires", name: "Tires", parentId: "car", type: "expense" },
      { id: "food", name: "Food", parentId: null, type: "expense" },
      { id: "gym", name: "Gym", parentId: null, type: "expense" },
    ];
    const rows = [
      { ...row("Car", 50000, 3000), categoryId: "car" },
      { ...row("Oil", 9000, 2000), categoryId: "oil", parentId: "car" },
      { ...row("Food", 0, 700), categoryId: "food" },
    ];
    const items = buildBudgetItems(rows, categories);
    expect(items.map((item) => item.row.categoryId)).toEqual(["car", "food"]);
    const car = items[0];
    // Its own 3000 plus 2000 of Oil, shown once.
    expect(car?.row.actualAmount).toBe(5000);
    expect(car?.group?.directAmount).toBe(3000);
    expect(car?.group?.allocated).toBe(9000);
    // A budgeted parent lists every subcategory, even without a budget or spending.
    expect(car?.group?.children.map((child) => child.categoryId)).toEqual(["oil", "tires"]);
    expect(items[1]?.group).toBeNull();
  });

  it("lists only used subcategories under a parent without a budget", () => {
    const categories = [
      { id: "car", name: "Car", parentId: null, type: "expense" },
      { id: "oil", name: "Oil", parentId: "car", type: "expense" },
      { id: "tires", name: "Tires", parentId: "car", type: "expense" },
    ];
    const items = buildBudgetItems(
      [{ ...row("Oil", 0, 2000), categoryId: "oil", parentId: "car" }],
      categories,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.row.budgetedAmount).toBe(0);
    expect(items[0]?.group?.children.map((child) => child.categoryId)).toEqual(["oil"]);
  });

  it("does not add a budgeted parent's subcategories to the month total", () => {
    expect(
      expenseBudgetTotal([
        { ...row("Car", 50000, 0), categoryId: "car" },
        { ...row("Oil", 9000, 0), categoryId: "oil", parentId: "car" },
        { ...row("Food", 1000, 0), categoryId: "food" },
      ]),
    ).toBe(51000);
  });

  it("splits the budget in shares and folds the tail into Other", () => {
    const rows = [
      row("A", 500, 0),
      row("B", 300, 0),
      row("C", 100, 0),
      row("D", 60, 0),
      row("E", 30, 0),
      row("F", 10, 0),
    ];
    const shares = budgetAllocation(rows, 5);
    expect(shares.map((item) => item.name)).toEqual(["A", "B", "C", "D", "Other"]);
    expect(shares.map((item) => item.percent)).toEqual([50, 30, 10, 6, 4]);
    expect(budgetAllocation([row("A", 0, 10)])).toEqual([]);
  });
});

describe("withCategoryBudget", () => {
  const month = {
    categories: { expense: [row("Rent", 1000, 200), row("Fun", 0, 50)] },
    totals: { expenseBudgeted: 1000 },
  };

  it("changes one limit and the total", () => {
    const next = withCategoryBudget(month, "rent", 1500);
    expect(next.categories.expense[0]?.budgetedAmount).toBe(1500);
    expect(next.totals.expenseBudgeted).toBe(1500);
    expect(month.totals.expenseBudgeted).toBe(1000);
  });

  it("removes a limit with 0 and ignores unknown categories", () => {
    expect(withCategoryBudget(month, "rent", 0).totals.expenseBudgeted).toBe(0);
    expect(withCategoryBudget(month, "nope", 5)).toBe(month);
  });
});
