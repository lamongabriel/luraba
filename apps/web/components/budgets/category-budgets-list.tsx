"use client";

import { PieChartIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Category } from "@luraba/contracts";
import * as React from "react";
import { AmountDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BUDGET_SORT_OPTIONS,
  BUDGET_STATUS_FILTERS,
  type BudgetItem,
  type BudgetRow,
  type BudgetSort,
  type BudgetStatusFilter,
  buildBudgetItems,
  filterAndSortBudgetItems,
  topSpenderRanks,
} from "@/lib/budgets";
import { CategoryBudgetRow, CategoryBudgetRowSkeleton } from "./category-budget-row";

/** The toolbar above the list (filter and sort); the loading twin shares it. */
function ListToolbar({ controls }: { controls?: React.ReactNode }) {
  return <div className="flex min-h-8 flex-wrap items-center justify-start gap-3">{controls}</div>;
}

/** Percent change of `spent` against `previous`; `null` when there was nothing before. */
function percentChange(spent: number, previous: number): number | null {
  return previous > 0 ? Math.round(((spent - previous) / previous) * 1000) / 10 : null;
}

/**
 * The page's main body: category budgets sitting directly on the page. A category without
 * subcategories is a plain row; a parent with subcategories is one group (a stronger parent row,
 * its subcategories indented under it). The biggest spenders carry a "#1 spend" marker and every
 * row shows its change vs last month.
 */
export function CategoryBudgetsList({
  rows,
  categories,
  previous,
  currencyCode,
  precision,
  language,
  onSave,
  onRemove,
  onAdd,
}: {
  rows: BudgetRow[];
  categories: ReadonlyArray<Pick<Category, "id" | "name" | "parentId" | "type" | "icon" | "color">>;
  /** Category id -> spending last month; `undefined` while the insights are loading or failed. */
  previous: ReadonlyMap<string, number> | undefined;
  currencyCode: string;
  precision: number;
  language: string;
  onSave: (categoryId: string, amount: number) => void;
  onRemove: (categoryId: string) => void;
  onAdd: () => void;
}) {
  const [status, setStatus] = React.useState<BudgetStatusFilter>("all");
  const [sort, setSort] = React.useState<BudgetSort>("spent");
  const categoriesById = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const items = buildBudgetItems(rows, categories);
  const shown = filterAndSortBudgetItems(items, status, sort);
  const ranks = topSpenderRanks(items.map((item) => item.row));
  const money = { currencyCode, precision, language };

  const changeOf = (spent: number, ids: string[]) =>
    previous
      ? percentChange(
          spent,
          ids.reduce((sum, id) => sum + (previous.get(id) ?? 0), 0),
        )
      : undefined;

  const renderRow = (
    row: BudgetRow,
    variant: "flat" | "parent" | "child",
    options?: { rank?: number; change?: number | null; caption?: React.ReactNode },
  ) => (
    <CategoryBudgetRow
      key={row.categoryId}
      row={row}
      category={categoriesById.get(row.categoryId) ?? null}
      variant={variant}
      rank={options?.rank}
      change={options?.change}
      caption={options?.caption}
      {...money}
      onSave={onSave}
      onRemove={onRemove}
    />
  );

  const renderItem = (item: BudgetItem) => {
    const { row, group } = item;
    const rank = ranks.get(row.categoryId);
    if (!group) {
      return (
        <ul key={row.categoryId} className="border-b border-border/40 py-1 last:border-b-0">
          {renderRow(row, "flat", { rank, change: changeOf(row.actualAmount, [row.categoryId]) })}
        </ul>
      );
    }
    const ids = [row.categoryId, ...group.children.map((child) => child.categoryId)];
    const unallocated = row.budgetedAmount - group.allocated;
    return (
      <ul key={row.categoryId} className="space-y-3 border-b border-border/40 py-5 last:border-b-0">
        {renderRow(row, "parent", {
          rank,
          change: changeOf(row.actualAmount, ids),
          caption:
            row.budgetedAmount > 0 ? (
              <>
                <AmountDisplay amount={group.allocated} {...money} /> of{" "}
                <AmountDisplay amount={row.budgetedAmount} {...money} /> allocated to subcategories
                {" · "}
                {unallocated >= 0 ? (
                  <>
                    <AmountDisplay amount={unallocated} {...money} /> unallocated
                  </>
                ) : (
                  <span className="text-destructive">over-allocated</span>
                )}
              </>
            ) : (
              "No limit for the whole category. Set one to share it across the subcategories."
            ),
        })}
        <li>
          <ul className="ml-6 space-y-0.5 border-l border-border/60 pl-3">
            {group.children.map((child) =>
              renderRow(child, "child", {
                change: changeOf(child.actualAmount, [child.categoryId]),
              }),
            )}
            {group.directAmount > 0 ? (
              <li className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-muted-foreground">
                <span>{row.categoryName} itself</span>
                <span>
                  <AmountDisplay amount={group.directAmount} {...money} /> spent
                </span>
              </li>
            ) : null}
          </ul>
        </li>
      </ul>
    );
  };

  return (
    <section aria-label="Category budgets" className="min-w-0 space-y-4">
      <ListToolbar
        controls={
          items.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as BudgetStatusFilter)}
              >
                <SelectTrigger aria-label="Filter by status" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_STATUS_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(value) => setSort(value as BudgetSort)}>
                <SelectTrigger aria-label="Sort categories" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      Sort: {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          variant="embedded"
          icon={<HugeiconsIcon icon={PieChartIcon} strokeWidth={1.8} className="size-5" />}
          title="No budgets this month"
          description="Give a category a monthly limit, or copy last month's budgets from the menu above."
          action={
            <PermissionButton permission={PERMISSIONS.BUDGETS_UPDATE} onClick={onAdd}>
              Add a budget
            </PermissionButton>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          variant="embedded"
          title="No categories match"
          description="Try another status to see more categories."
        />
      ) : (
        <div>{shown.map(renderItem)}</div>
      )}
    </section>
  );
}

/** Loading twin of `CategoryBudgetsList`: the toolbar, one group (parent and two children) and plain rows. */
export function CategoryBudgetsListSkeleton() {
  return (
    <section
      role="status"
      aria-busy="true"
      aria-label="Loading category budgets"
      className="min-w-0 space-y-4"
    >
      <ListToolbar
        controls={
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-40" />
          </div>
        }
      />
      <div>
        <ul className="space-y-3 border-b border-border/40 py-5">
          <CategoryBudgetRowSkeleton variant="parent" />
          <li>
            <ul className="ml-6 space-y-0.5 border-l border-border/60 pl-3">
              <CategoryBudgetRowSkeleton variant="child" />
              <CategoryBudgetRowSkeleton variant="child" />
            </ul>
          </li>
        </ul>
        {[0, 1, 2].map((row) => (
          <ul key={row} className="border-b border-border/40 py-1 last:border-b-0">
            <CategoryBudgetRowSkeleton />
          </ul>
        ))}
      </div>
    </section>
  );
}
