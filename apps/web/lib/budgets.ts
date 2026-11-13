import type { CreditExpenseTiming, CreditInstallmentBudgetMode } from "@luraba/contracts";
import type { BudgetItem, BudgetRow } from "@luraba/domain";

/** Labels for the credit-card budget settings; shared by the household form and the Budgets page. */
export const CREDIT_EXPENSE_TIMING_OPTIONS: ReadonlyArray<{
  value: CreditExpenseTiming;
  label: string;
  description: string;
}> = [
  {
    value: "spend_month",
    label: "Month spent",
    description: "Counts in the month of the purchase (or the statement closing month).",
  },
  {
    value: "payment_month",
    label: "Month the bill is due",
    description: "Counts in the month the card bill is due.",
  },
  {
    value: "month_after_payment",
    label: "Month after the bill is due",
    description: "Counts in the month after the card bill is due.",
  },
];

export const CREDIT_INSTALLMENT_MODE_OPTIONS: ReadonlyArray<{
  value: CreditInstallmentBudgetMode;
  label: string;
  description: string;
}> = [
  {
    value: "per_installment",
    label: "Each installment",
    description: "Each installment counts in its own month.",
  },
  {
    value: "full_amount",
    label: "Full purchase",
    description: "The whole purchase counts at once, in the timing month.",
  },
];

// ---------------------------------------------------------------------------
// Category budgets
// ---------------------------------------------------------------------------

export type { BudgetItem, BudgetRow } from "@luraba/domain";
export { buildBudgetItems } from "@luraba/domain";

/** Money still free in a row (positive), or overspent (negative). */
export function budgetRowRemaining(budgeted: number, actual: number): number {
  return budgeted - actual;
}

/** Share of the budget already spent, capped to 0-100. A row with no budget but spending is full. */
export function budgetProgressPercent(budgeted: number, actual: number): number {
  if (budgeted <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((actual / budgeted) * 100)));
}

export type BudgetStatus = "on_track" | "needs_attention" | "over" | "no_budget";

/** From this share of the budget spent, a category (or the month) needs attention. */
export const BUDGET_ATTENTION_PERCENT = 80;

/** How a budget is doing: `no_budget` is spending with no limit, `over` is beyond 100%. */
export function budgetStatus(budgeted: number, actual: number): BudgetStatus {
  if (budgeted <= 0) return actual > 0 ? "no_budget" : "on_track";
  if (actual > budgeted) return "over";
  return (actual / budgeted) * 100 >= BUDGET_ATTENTION_PERCENT ? "needs_attention" : "on_track";
}

/** Labels and colors of the statuses: one place, so badges, rings and the hero always agree. */
export const BUDGET_STATUS_DISPLAY: Record<
  BudgetStatus,
  {
    label: string;
    tone: "positive" | "warning" | "negative" | "neutral";
    badgeClassName: string;
    barClassName: string;
  }
> = {
  on_track: {
    label: "On track",
    tone: "positive",
    badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    barClassName: "bg-primary",
  },
  needs_attention: {
    label: "Needs attention",
    tone: "warning",
    badgeClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    barClassName: "bg-amber-500",
  },
  over: {
    label: "Over budget",
    tone: "negative",
    badgeClassName: "bg-destructive/10 text-destructive",
    barClassName: "bg-destructive",
  },
  no_budget: {
    label: "No budget",
    tone: "neutral",
    badgeClassName: "bg-muted text-muted-foreground",
    barClassName: "bg-muted-foreground/40",
  },
};

export const BUDGET_STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "on_track", label: "On track" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "over", label: "Over budget" },
  { value: "no_budget", label: "No budget" },
] as const;
export type BudgetStatusFilter = (typeof BUDGET_STATUS_FILTERS)[number]["value"];

export const BUDGET_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "spent", label: "Most spent" },
  { value: "used", label: "Most used" },
  { value: "budget", label: "Biggest budget" },
] as const;
export type BudgetSort = (typeof BUDGET_SORT_OPTIONS)[number]["value"];

/** Expense categories worth a card: planned, or already spent on. */
export function visibleBudgetRows<T extends BudgetRow>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.budgetedAmount > 0 || row.actualAmount > 0);
}

/** Applies the status filter and the sort of the category list. Never mutates `rows`. */
export function filterAndSortBudgetRows<T extends BudgetRow>(
  rows: readonly T[],
  status: BudgetStatusFilter,
  sort: BudgetSort,
): T[] {
  const used = (row: T) =>
    row.budgetedAmount > 0 ? row.actualAmount / row.budgetedAmount : row.actualAmount > 0 ? 1e9 : 0;
  const byName = (a: T, b: T) => a.categoryName.localeCompare(b.categoryName);
  const compare: Record<BudgetSort, (a: T, b: T) => number> = {
    name: byName,
    spent: (a, b) => b.actualAmount - a.actualAmount || byName(a, b),
    used: (a, b) => used(b) - used(a) || byName(a, b),
    budget: (a, b) => b.budgetedAmount - a.budgetedAmount || byName(a, b),
  };
  return rows
    .filter(
      (row) => status === "all" || budgetStatus(row.budgetedAmount, row.actualAmount) === status,
    )
    .sort(compare[sort]);
}

// ---------------------------------------------------------------------------
// Pace: days left, daily allowance and projected spending
// ---------------------------------------------------------------------------

export type BudgetPace = {
  daysInMonth: number;
  /** Days still to go in the month, today included; 0 for a past month. */
  daysLeft: number;
  /** What can be spent per remaining day to stay on budget; null when the month is over. */
  perDayLeft: number | null;
  /** Where spending ends up if the month goes on at the same pace; null outside the current month. */
  projectedSpend: number | null;
  phase: "past" | "current" | "future";
};

/** `month` is `YYYY-MM`; `today` is `YYYY-MM-DD` in the user's time zone. All amounts in minor units. */
export function budgetPace(params: {
  month: string;
  today: string;
  budgeted: number;
  spent: number;
}): BudgetPace {
  const [year, monthNumber] = params.month.split("-").map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const todayMonth = params.today.slice(0, 7);
  const phase =
    params.month < todayMonth ? "past" : params.month > todayMonth ? "future" : "current";

  if (phase === "past") {
    return { daysInMonth, daysLeft: 0, perDayLeft: null, projectedSpend: null, phase };
  }
  const dayOfMonth = phase === "current" ? Number(params.today.slice(8, 10)) : 0;
  const daysLeft = daysInMonth - dayOfMonth + (phase === "current" ? 1 : 0);
  return {
    daysInMonth,
    daysLeft,
    perDayLeft: Math.round(Math.max(0, params.budgeted - params.spent) / daysLeft),
    projectedSpend:
      phase === "current" ? Math.round((params.spent / dayOfMonth) * daysInMonth) : null,
    phase,
  };
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/** The PUT body of a month: every row of `budget` with a positive budget, as it is saved today. */
export function budgetToReplaceBody(budget: {
  categories: { income: readonly BudgetRow[]; expense: readonly BudgetRow[] };
}): {
  income: Array<{ categoryId: string; amount: number }>;
  expense: Array<{ categoryId: string; amount: number }>;
} {
  const collect = (rows: readonly BudgetRow[]) =>
    rows
      .filter((row) => row.budgetedAmount > 0)
      .map((row) => ({ categoryId: row.categoryId, amount: row.budgetedAmount }));
  return { income: collect(budget.categories.income), expense: collect(budget.categories.expense) };
}

/**
 * The PUT body after changing one expense category's budget (`amount` 0 removes it). The month is
 * replaced as a whole by the API, so everything else is sent back unchanged, income included.
 */
export function replaceBodyWithExpense(
  budget: Parameters<typeof budgetToReplaceBody>[0],
  categoryId: string,
  amount: number,
) {
  const body = budgetToReplaceBody(budget);
  const others = body.expense.filter((item) => item.categoryId !== categoryId);
  return { ...body, expense: amount > 0 ? [...others, { categoryId, amount }] : others };
}

/** Each category's share of the total budget, biggest first; the tail beyond `max` is "Other". */
export function budgetAllocation<T extends BudgetRow>(
  rows: readonly T[],
  max = 5,
): Array<{ id: string; name: string; percent: number; source: T | null }> {
  const planned = rows
    .filter((row) => row.budgetedAmount > 0)
    .sort((a, b) => b.budgetedAmount - a.budgetedAmount);
  const total = planned.reduce((sum, row) => sum + row.budgetedAmount, 0);
  if (total === 0) return [];
  const share = (amount: number) => Math.round((amount / total) * 100);
  const head = planned.slice(0, planned.length > max ? max - 1 : max).map((row) => ({
    id: row.categoryId,
    name: row.categoryName,
    percent: share(row.budgetedAmount),
    source: row,
  }));
  const tail = planned.slice(head.length);
  return tail.length === 0
    ? head
    : [
        ...head,
        {
          id: "other",
          name: "Other",
          percent: share(tail.reduce((sum, row) => sum + row.budgetedAmount, 0)),
          source: null,
        },
      ];
}

// ---------------------------------------------------------------------------
// Comparison with the previous month
// ---------------------------------------------------------------------------

/** Spending change in percent versus the month before, from the insights history; null if unknown. */
export function spendingChange(
  history: ReadonlyArray<{ spentAmount: number }> | undefined,
): number | null {
  const current = history?.at(-1);
  const previous = history?.at(-2);
  if (!current || !previous || previous.spentAmount <= 0) return null;
  return (
    Math.round(((current.spentAmount - previous.spentAmount) / previous.spentAmount) * 1000) / 10
  );
}

/** How many of the biggest spenders get a "#1 spend" marker in the category list. */
export const TOP_SPENDER_COUNT = 3;

/** Category id -> rank (1 is the biggest) for the categories with the most spending this month. */
export function topSpenderRanks(rows: readonly BudgetRow[]): Map<string, number> {
  return new Map(
    rows
      .filter((row) => row.actualAmount > 0)
      .sort((a, b) => b.actualAmount - a.actualAmount)
      .slice(0, TOP_SPENDER_COUNT)
      .map((row, index) => [row.categoryId, index + 1]),
  );
}

/**
 * The month as it looks right after changing one expense category's limit (`amount` 0 removes it),
 * for the optimistic update. Returns the budget unchanged when the category has no row yet.
 */
export function withCategoryBudget<
  T extends { categories: { expense: BudgetRow[] }; totals: { expenseBudgeted: number } },
>(budget: T, categoryId: string, amount: number): T {
  if (!budget.categories.expense.some((row) => row.categoryId === categoryId)) return budget;
  const expense = budget.categories.expense.map((row) =>
    row.categoryId === categoryId ? { ...row, budgetedAmount: amount } : row,
  );
  return {
    ...budget,
    categories: { ...budget.categories, expense },
    totals: { ...budget.totals, expenseBudgeted: expenseBudgetTotal(expense) },
  };
}

/**
 * The month's planned spending: a parent's budget already contains its subcategories' budgets, so
 * subcategories of a budgeted parent are not added again (the API totals follow the same rule).
 */
export function expenseBudgetTotal(rows: readonly BudgetRow[]): number {
  const budgetedParents = new Set(
    rows.filter((row) => row.budgetedAmount > 0).map((row) => row.categoryId),
  );
  return rows
    .filter((row) => !(row.parentId && budgetedParents.has(row.parentId)))
    .reduce((sum, row) => sum + row.budgetedAmount, 0);
}

// ---------------------------------------------------------------------------
// Parents and subcategories
// ---------------------------------------------------------------------------

/** Applies the status filter and the sort to the top-level items (children follow the sort too). */
export function filterAndSortBudgetItems(
  items: readonly BudgetItem[],
  status: BudgetStatusFilter,
  sort: BudgetSort,
): BudgetItem[] {
  const order = (rows: BudgetRow[]) => filterAndSortBudgetRows(rows, "all", sort);
  const kept = filterAndSortBudgetRows(
    items.map((item) => item.row),
    status,
    sort,
  );
  const byId = new Map(items.map((item) => [item.row.categoryId, item]));
  return kept.flatMap((row) => {
    const item = byId.get(row.categoryId);
    if (!item) return [];
    return [
      item.group
        ? { ...item, group: { ...item.group, children: order(item.group.children) } }
        : item,
    ];
  });
}
