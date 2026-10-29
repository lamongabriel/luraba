import type { CreditExpenseTiming, CreditInstallmentBudgetMode } from "@luraba/contracts";

/** Labels for the credit-card budget settings; shared by the household form and the budget page. */
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
// The budget grid
// ---------------------------------------------------------------------------

/**
 * The sections of the budget page, in order. Each is a category type with its own wording.
 * Savings and investments will be added here (and in the API response) once they exist as
 * categories; nothing else in the page needs to change.
 */
export const BUDGET_SECTIONS = [
  {
    key: "income",
    categoryType: "income",
    title: "Income",
    subtitle: "What you expect to receive this month.",
    leftLabel: "To receive",
    overLabel: "Received extra",
    addLabel: "Add an income category",
  },
  {
    key: "expense",
    categoryType: "expense",
    title: "Expenses",
    subtitle: "What you plan to spend, category by category.",
    leftLabel: "Available",
    overLabel: "Overspent",
    addLabel: "Add an expense category",
  },
] as const satisfies ReadonlyArray<{
  key: "income" | "expense";
  categoryType: "income" | "expense";
  title: string;
  subtitle: string;
  leftLabel: string;
  overLabel: string;
  addLabel: string;
}>;

export type BudgetSectionKey = (typeof BUDGET_SECTIONS)[number]["key"];

export type BudgetRow = {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  budgetedAmount: number;
  actualAmount: number;
};

/** Money still free in a row (positive), or overspent / received beyond plan (negative). */
export function budgetRowRemaining(budgeted: number, actual: number): number {
  return budgeted - actual;
}

/** How full the bar is, capped to 0-100. A row with no budget but activity is full. */
export function budgetProgressPercent(budgeted: number, actual: number): number {
  if (budgeted <= 0) return actual > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((actual / budgeted) * 100)));
}

/**
 * Orders rows alphabetically with sub-categories right under their parent (when the parent is in
 * the same list). Returns the row plus how deep it sits, for indenting.
 */
export function orderBudgetRows<
  T extends Pick<BudgetRow, "categoryId" | "categoryName" | "parentId">,
>(rows: readonly T[]): Array<{ row: T; depth: 0 | 1 }> {
  const byName = (a: T, b: T) => a.categoryName.localeCompare(b.categoryName);
  const ids = new Set(rows.map((row) => row.categoryId));
  const roots = rows.filter((row) => !row.parentId || !ids.has(row.parentId)).sort(byName);

  return roots.flatMap((root) => [
    { row: root, depth: 0 as const },
    ...rows
      .filter((row) => row.parentId === root.categoryId)
      .sort(byName)
      .map((row) => ({ row, depth: 1 as const })),
  ]);
}

/**
 * The PUT body for a month: every category with a positive budget, in the order of the sections.
 * `amounts` are canonical decimal strings in major units, keyed by category id.
 */
export function buildReplaceBudgetBody(
  amounts: Readonly<Record<BudgetSectionKey, Readonly<Record<string, string>>>>,
  toMinorUnits: (major: number) => number,
): {
  income: Array<{ categoryId: string; amount: number }>;
  expense: Array<{ categoryId: string; amount: number }>;
} {
  const collect = (section: Readonly<Record<string, string>>) =>
    Object.entries(section)
      .map(([categoryId, value]) => ({ categoryId, amount: toMinorUnits(Number(value || 0)) }))
      .filter((item) => item.amount > 0);

  return { income: collect(amounts.income), expense: collect(amounts.expense) };
}
