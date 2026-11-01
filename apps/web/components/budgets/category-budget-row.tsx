"use client";

import { ArrowDown01Icon, ArrowUp01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Category } from "@luraba/contracts";
import * as React from "react";

import { AmountDisplay, CategoryDisplay } from "@/components/display";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/masked-input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BUDGET_STATUS_DISPLAY,
  type BudgetRow,
  budgetProgressPercent,
  budgetRowRemaining,
  budgetStatus,
} from "@/lib/budgets";
import { formatNumber, majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { CATEGORY_ROW_HEIGHT, CHILD_ROW_HEIGHT, PARENT_ROW_HEIGHT } from "./budget-layout";

export type CategoryRowVariant = "flat" | "parent" | "child";

/** A plain category, the parent of a group (stronger, with a caption line) or one of its subcategories. */
const ROW_VARIANT: Record<CategoryRowVariant, string> = {
  flat: cn("gap-2.5 px-3 hover:bg-muted/40", CATEGORY_ROW_HEIGHT),
  parent: cn("gap-2 rounded-lg bg-muted/30 px-4", PARENT_ROW_HEIGHT),
  child: cn("gap-1.5 px-3 hover:bg-muted/40", CHILD_ROW_HEIGHT),
};
const rowClass = (variant: CategoryRowVariant) =>
  cn("flex flex-col justify-center transition-colors", ROW_VARIANT[variant]);

/** Spending versus the previous month: red up, green down; "New" when there was none before. */
function Change({ percent, language }: { percent: number | null | undefined; language: string }) {
  if (percent === undefined) return null;
  if (percent === null) return <span className="text-xs text-muted-foreground">New</span>;
  const up = percent > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        percent === 0
          ? "text-muted-foreground"
          : up
            ? "text-destructive"
            : "text-emerald-600 dark:text-emerald-400",
      )}
      title="Compared with the previous month"
    >
      {percent === 0 ? null : (
        <HugeiconsIcon
          icon={up ? ArrowUp01Icon : ArrowDown01Icon}
          strokeWidth={2}
          className="size-3"
        />
      )}
      {formatNumber(Math.abs(percent), language, { maximumFractionDigits: 1 })}%
      <span className="sr-only"> {up ? "more" : "less"} than last month</span>
    </span>
  );
}

/**
 * The limit of a row, edited in place: click it, type, Enter or blur saves, Escape cancels. An empty
 * or zero value cancels too; removing a budget goes through the "Remove" button and a confirmation.
 */
function BudgetLimit({
  row,
  canEdit,
  precision,
  language,
  money,
  onSave,
  onRemove,
}: {
  row: BudgetRow;
  canEdit: boolean;
  precision: number;
  language: string;
  money: { currencyCode: string; precision: number; language: string };
  onSave: (categoryId: string, amount: number) => void;
  onRemove: (categoryId: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState("");
  const done = React.useRef(false);
  const hasBudget = row.budgetedAmount > 0;

  const start = () => {
    done.current = false;
    setValue(hasBudget ? String(minorToMajorUnits(row.budgetedAmount, precision)) : "");
    setEditing(true);
  };
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    const minor = majorToMinorUnits(Number(value || 0), precision);
    if (save && minor > 0 && minor !== row.budgetedAmount) onSave(row.categoryId, minor);
  };

  if (editing) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        {hasBudget ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-destructive"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              done.current = true;
              setEditing(false);
              onRemove(row.categoryId);
            }}
          >
            Remove
          </Button>
        ) : null}
        <MoneyInput
          autoFocus
          aria-label={`${row.categoryName} monthly limit`}
          className="h-7 w-28 text-right text-xs"
          value={value}
          precision={precision}
          language={language}
          onValueChange={setValue}
          onBlur={() => finish(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") finish(true);
            if (event.key === "Escape") finish(false);
          }}
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={start}
      title={canEdit ? "Click to change the limit" : undefined}
      className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 hover:bg-muted enabled:cursor-text disabled:no-underline"
    >
      {hasBudget ? <AmountDisplay amount={row.budgetedAmount} {...money} /> : "Set a limit"}
    </button>
  );
}

/**
 * One category budget as a row sitting directly on the page: the category (with a "#1 spend" marker
 * on the biggest spenders), its change versus last month, what is left, and an edit button; under
 * it a thin bar and "spent of total". Over the limit it says how much is exceeded; spent to the
 * last cent it says completed.
 */
export function CategoryBudgetRow({
  row,
  category,
  rank,
  change,
  variant = "flat",
  caption,
  currencyCode,
  precision,
  language,
  onSave,
  onRemove,
}: {
  row: BudgetRow;
  category: Pick<Category, "name" | "icon" | "color"> | null;
  /** 1-3 for the categories with the most spending this month. */
  rank?: number;
  /** Percent vs last month; `null` when there was no spending before, `undefined` while unknown. */
  change: number | null | undefined;
  variant?: CategoryRowVariant;
  /** A muted line under the bar (a parent: how much is shared with its subcategories). */
  caption?: React.ReactNode;
  currencyCode: string;
  precision: number;
  language: string;
  onSave: (categoryId: string, amount: number) => void;
  onRemove: (categoryId: string) => void;
}) {
  const canEdit = useCan()(PERMISSIONS.BUDGETS_UPDATE);
  const status = budgetStatus(row.budgetedAmount, row.actualAmount);
  const display = BUDGET_STATUS_DISPLAY[status];
  const percent = budgetProgressPercent(row.budgetedAmount, row.actualAmount);
  const remaining = budgetRowRemaining(row.budgetedAmount, row.actualAmount);
  const hasBudget = row.budgetedAmount > 0;
  const completed = hasBudget && remaining === 0;
  const money = { currencyCode, precision, language };

  return (
    <li aria-label={`${row.categoryName} budget`} className={rowClass(variant)}>
      <div className="flex h-7 items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CategoryDisplay
            category={category ?? { name: row.categoryName, icon: null, color: null }}
            variant="inline"
            size={variant === "child" ? "sm" : "md"}
            className={variant === "parent" ? "font-semibold" : undefined}
          />
          {rank ? (
            <span
              className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
              title="One of the categories with the most spending this month"
            >
              #{rank} spend
            </span>
          ) : null}
        </div>
        <div className="hidden w-16 shrink-0 justify-end sm:flex">
          {row.actualAmount > 0 ? <Change percent={change} language={language} /> : null}
        </div>
        <Badge
          className={cn(
            "shrink-0 gap-1 border-0",
            completed ? "bg-primary/10 text-primary" : display.badgeClassName,
          )}
        >
          {completed ? (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
              Completed
            </>
          ) : !hasBudget ? (
            "No budget"
          ) : remaining < 0 ? (
            <>
              <AmountDisplay
                amount={Math.abs(remaining)}
                kind="expense"
                showSign={false}
                {...money}
              />{" "}
              exceeded
            </>
          ) : (
            <>
              <AmountDisplay amount={remaining} kind="neutral" showSign={false} {...money} /> left
            </>
          )}
        </Badge>
      </div>
      <div className="flex h-7 items-center gap-3">
        <div
          role="progressbar"
          aria-label={`${row.categoryName} budget used`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full", display.barClassName)}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <AmountDisplay amount={row.actualAmount} {...money} />
          {hasBudget ? "of" : "spent"}
          <BudgetLimit
            row={row}
            canEdit={canEdit}
            precision={precision}
            language={language}
            money={money}
            onSave={onSave}
            onRemove={onRemove}
          />
        </span>
      </div>
      {caption ? <div className="text-xs text-muted-foreground">{caption}</div> : null}
    </li>
  );
}

/** The loading twin of `CategoryBudgetRow`: name line and bar line at the same heights. */
export function CategoryBudgetRowSkeleton({ variant = "flat" }: { variant?: CategoryRowVariant }) {
  return (
    <li aria-hidden="true" className={rowClass(variant)}>
      <div className="flex h-7 items-center justify-between gap-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="flex h-7 items-center gap-3">
        <Skeleton className="h-1.5 flex-1 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      {variant === "parent" ? <Skeleton className="h-4 w-64" /> : null}
    </li>
  );
}
