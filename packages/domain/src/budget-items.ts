/**
 * Budget rollup shared by the web Budgets page and the MCP `report_budget` tool, so both always
 * show the same numbers. Amounts are in whatever unit the rows carry (minor units from the API).
 */

export type BudgetRow = {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  budgetedAmount: number;
  actualAmount: number;
};

/** A category (or a parent with all it holds) as one top-level entry of the list. */
export type BudgetItem = {
  /** The category itself; for a parent, `actualAmount` is its own spending plus its subcategories'. */
  row: BudgetRow;
  /** Only for a parent that has subcategories. */
  group: {
    children: BudgetRow[];
    /** The parent's own spending, without the subcategories. */
    directAmount: number;
    /** What the subcategories' limits add up to. */
    allocated: number;
  } | null;
};

type CategoryRef = { id: string; name: string; parentId: string | null; type: string };

/**
 * Builds the list: a category without subcategories is a plain item; a parent that has
 * subcategories becomes a group. A parent with a budget lists every subcategory (budgeted or not),
 * without one only the subcategories with a budget or spending. The parent is never duplicated: its
 * `row` carries its own limit and the spending of itself plus its subcategories.
 */
export function buildBudgetItems(
  rows: readonly BudgetRow[],
  categories: readonly CategoryRef[],
): BudgetItem[] {
  const expense = categories.filter((category) => category.type === "expense");
  const rowById = new Map(rows.map((row) => [row.categoryId, row]));
  const childrenOf = new Map<string, CategoryRef[]>();
  for (const category of expense) {
    if (!category.parentId) continue;
    childrenOf.set(category.parentId, [...(childrenOf.get(category.parentId) ?? []), category]);
  }
  const empty = (category: CategoryRef): BudgetRow => ({
    categoryId: category.id,
    categoryName: category.name,
    parentId: category.parentId,
    budgetedAmount: 0,
    actualAmount: 0,
  });
  const used = (row: BudgetRow | undefined) =>
    !!row && (row.budgetedAmount > 0 || row.actualAmount > 0);
  const known = new Set(expense.map((category) => category.id));

  const items: BudgetItem[] = [];
  const topLevel = new Map<string, BudgetRow>();
  for (const category of expense) {
    if (category.parentId && known.has(category.parentId)) continue;
    topLevel.set(category.id, rowById.get(category.id) ?? empty(category));
  }
  // Rows of categories the list of categories does not know (should not happen) stay visible.
  for (const row of rows) {
    if (!known.has(row.categoryId)) topLevel.set(row.categoryId, row);
  }

  for (const [id, own] of topLevel) {
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      if (used(own)) items.push({ row: own, group: null });
      continue;
    }
    const children = kids
      .map((kid) => rowById.get(kid.id) ?? empty(kid))
      .filter((child) => own.budgetedAmount > 0 || used(child));
    const directAmount = own.actualAmount;
    const total = directAmount + children.reduce((sum, child) => sum + child.actualAmount, 0);
    if (!used(own) && children.length === 0) continue;
    items.push({
      row: { ...own, actualAmount: total },
      group: {
        children,
        directAmount,
        allocated: children.reduce((sum, child) => sum + child.budgetedAmount, 0),
      },
    });
  }
  return items;
}
