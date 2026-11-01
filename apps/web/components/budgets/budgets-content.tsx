"use client";

import type { BudgetInsights, Category, MonthlyBudget } from "@luraba/contracts";
import * as React from "react";

import { type BudgetPace, buildBudgetItems, spendingChange } from "@/lib/budgets";
import { BudgetAside } from "./budget-aside";
import { BUDGETS_BODY_GRID } from "./budget-layout";
import { BudgetSummaryBand } from "./budget-summary-band";
import { CategoryBudgetsList } from "./category-budgets-list";

/** The Budgets page body: summary band, then the categories with the supporting rail. `BudgetsLoading` mirrors it. */
export function BudgetsContent({
  budget,
  insights,
  categories,
  pace,
  precision,
  language,
  onSave,
  onRemove,
  onAdd,
}: {
  budget: MonthlyBudget;
  insights: {
    data: BudgetInsights | undefined;
    isPending: boolean;
    isError: boolean;
    refetch: () => void;
  };
  categories: Category[];
  pace: BudgetPace;
  precision: number;
  language: string;
  onSave: (categoryId: string, amount: number) => void;
  onRemove: (categoryId: string) => void;
  onAdd: () => void;
}) {
  const categoriesById = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const previous = React.useMemo(
    () =>
      insights.data
        ? new Map(insights.data.mostExpenses.map((item) => [item.categoryId, item.previousAmount]))
        : undefined,
    [insights.data],
  );
  const currencyCode = budget.budgetCurrencyCode;
  const money = { currencyCode, precision, language };
  const { totals } = budget;
  // Top-level limits only: a parent's limit already contains its subcategories'.
  const allocation = buildBudgetItems(budget.categories.expense, categories)
    .filter((item) => item.row.budgetedAmount > 0)
    .map((item) => ({
      id: item.row.categoryId,
      name: item.row.categoryName,
      value: item.row.budgetedAmount,
      color: categoriesById.get(item.row.categoryId)?.color,
    }));

  return (
    <div>
      <BudgetSummaryBand
        budgeted={totals.expenseBudgeted}
        spent={totals.expenseActual}
        earned={totals.incomeActual}
        pace={pace}
        change={spendingChange(insights.data?.history)}
        money={money}
      />
      <div className={BUDGETS_BODY_GRID}>
        <CategoryBudgetsList
          rows={budget.categories.expense}
          categories={categories}
          previous={previous}
          currencyCode={currencyCode}
          precision={precision}
          language={language}
          onSave={onSave}
          onRemove={onRemove}
          onAdd={onAdd}
        />
        <BudgetAside
          insights={insights.data}
          isPending={insights.isPending}
          isError={insights.isError}
          onRetry={insights.refetch}
          allocation={allocation}
          money={money}
        />
      </div>
    </div>
  );
}
