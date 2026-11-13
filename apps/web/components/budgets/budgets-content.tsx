"use client";

import type { Category, MonthlyBudget } from "@luraba/contracts";
import * as React from "react";

import { SegmentedBarCard } from "@/components/charts";
import { buildBudgetItems, filterAndSortBudgetItems } from "@/lib/budgets";
import { BudgetCard } from "./budget-card";
import { BUDGET_ALLOCATION_HEIGHT, BUDGET_GRID } from "./budget-layout";

/**
 * The Budgets page body: how the month's budget is split across categories (one slim segmented bar), then a grid
 * of compact budget cards. `BudgetsLoading` (`_loading.tsx`) mirrors it.
 */
export function BudgetsContent({
  budget,
  categories,
  precision,
  language,
  canEdit,
  onEdit,
  onRemove,
}: {
  budget: MonthlyBudget;
  categories: Category[];
  precision: number;
  language: string;
  canEdit: boolean;
  onEdit: (categoryId: string) => void;
  onRemove: (categoryId: string) => void;
}) {
  const categoriesById = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const items = React.useMemo(
    () =>
      filterAndSortBudgetItems(
        buildBudgetItems(budget.categories.expense, categories),
        "all",
        "used",
      ),
    [budget, categories],
  );
  const currencyCode = budget.budgetCurrencyCode;
  const money = { currencyCode, precision, language };
  // Top-level limits only: a parent's limit already contains its subcategories'.
  const allocation = items
    .filter((item) => item.row.budgetedAmount > 0)
    .sort((a, b) => b.row.budgetedAmount - a.row.budgetedAmount)
    .map((item) => ({
      id: item.row.categoryId,
      name: item.row.categoryName,
      value: item.row.budgetedAmount,
      color: categoriesById.get(item.row.categoryId)?.color ?? undefined,
    }));

  return (
    <div className="space-y-6">
      <SegmentedBarCard
        title="Budget split"
        status="ready"
        data={allocation}
        maxSlices={5}
        emptyTitle="No limits yet"
        emptyDescription="Add a budget to see how the month is split."
        heightClassName={BUDGET_ALLOCATION_HEIGHT}
        {...money}
      />
      <ul className={BUDGET_GRID}>
        {items.map((item) => (
          <BudgetCard
            key={item.row.categoryId}
            item={item}
            category={categoriesById.get(item.row.categoryId) ?? null}
            categoriesById={categoriesById}
            money={money}
            canEdit={canEdit}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </div>
  );
}
