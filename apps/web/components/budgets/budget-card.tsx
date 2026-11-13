"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Category } from "@luraba/contracts";

import { AmountDisplay, CategoryDisplay } from "@/components/display";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BUDGET_STATUS_DISPLAY,
  type BudgetItem,
  budgetProgressPercent,
  budgetRowRemaining,
  budgetStatus,
} from "@/lib/budgets";
import { cn } from "@/lib/utils";
import { BUDGET_CARD_HEIGHT } from "./budget-layout";

type Money = { currencyCode: string; precision: number; language: string };

/**
 * One compact budget: the category, spent of the limit, a bar colored by status and what is left.
 * The whole card opens the editor; the menu adds removing the limit and editing a subcategory's own
 * limit. A category with spending but no limit shows "No limit" and a "Set a limit" action.
 */
export function BudgetCard({
  item,
  category,
  categoriesById,
  money,
  canEdit,
  onEdit,
  onRemove,
}: {
  item: BudgetItem;
  category: Category | null;
  categoriesById: ReadonlyMap<string, Category>;
  money: Money;
  canEdit: boolean;
  onEdit: (categoryId: string) => void;
  onRemove: (categoryId: string) => void;
}) {
  const { row, group } = item;
  const hasLimit = row.budgetedAmount > 0;
  const status = budgetStatus(row.budgetedAmount, row.actualAmount);
  const display = BUDGET_STATUS_DISPLAY[status];
  const percent = budgetProgressPercent(row.budgetedAmount, row.actualAmount);
  const remaining = budgetRowRemaining(row.budgetedAmount, row.actualAmount);
  const children =
    group?.children.filter((child) => child.budgetedAmount > 0 || child.actualAmount > 0) ?? [];

  return (
    <li
      className={cn(
        "relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 transition-colors",
        canEdit && "hover:bg-muted/40",
        BUDGET_CARD_HEIGHT,
      )}
    >
      {canEdit ? (
        <button
          type="button"
          aria-label={`${hasLimit ? "Edit" : "Set"} the ${row.categoryName} budget`}
          className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          onClick={() => onEdit(row.categoryId)}
        />
      ) : null}

      <div className="pointer-events-none relative flex items-center justify-between gap-2">
        <CategoryDisplay
          category={category ?? { name: row.categoryName, icon: null, color: null }}
          variant="inline"
          size="md"
        />
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${row.categoryName} budget actions`}
                className="pointer-events-auto relative -mr-1.5"
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => onEdit(row.categoryId)}>
                {hasLimit ? "Edit budget" : "Set a limit"}
              </DropdownMenuItem>
              {hasLimit ? (
                <DropdownMenuItem variant="destructive" onSelect={() => onRemove(row.categoryId)}>
                  Remove budget
                </DropdownMenuItem>
              ) : null}
              {children.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Subcategories</DropdownMenuLabel>
                  {children.map((child) => (
                    <DropdownMenuItem
                      key={child.categoryId}
                      onSelect={() => onEdit(child.categoryId)}
                    >
                      <span className="flex-1 truncate">
                        {categoriesById.get(child.categoryId)?.name ?? child.categoryName}
                      </span>
                      <AmountDisplay
                        amount={child.actualAmount}
                        {...money}
                        className="text-muted-foreground"
                      />
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="pointer-events-none relative flex items-baseline gap-1.5">
        <AmountDisplay
          amount={row.actualAmount}
          {...money}
          size="lg"
          className="font-semibold tabular-nums"
        />
        {hasLimit ? (
          <span className="flex items-baseline gap-1 text-sm text-muted-foreground">
            of <AmountDisplay amount={row.budgetedAmount} {...money} className="tabular-nums" />
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none relative space-y-1.5">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={`${row.categoryName}: ${display.label}`}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full", display.barClassName)}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          {hasLimit ? (
            <span
              className={cn(
                "font-medium",
                status === "over"
                  ? "text-destructive"
                  : status === "needs_attention"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
              )}
            >
              <AmountDisplay amount={Math.abs(remaining)} {...money} showSign={false} size="xs" />{" "}
              {remaining >= 0 ? "left" : "over"}
            </span>
          ) : (
            <span className="text-muted-foreground">No limit</span>
          )}
          <span className="text-muted-foreground tabular-nums">
            {hasLimit ? `${percent}%` : display.label}
          </span>
        </div>
      </div>
    </li>
  );
}
