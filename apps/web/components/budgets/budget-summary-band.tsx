"use client";

import { ProgressRing } from "@/components/charts";
import { AmountDisplay } from "@/components/display";
import { KpiStrip, KpiStripSkeleton } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BUDGET_STATUS_DISPLAY,
  type BudgetPace,
  budgetProgressPercent,
  budgetStatus,
} from "@/lib/budgets";
import { formatNumber } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { BUDGET_BAND_CELL } from "./budget-layout";

type Money = { currencyCode: string; precision: number; language: string };

const FIGURES = 4;

/**
 * The page's header strip, directly on the page: what is left of the month's limit with a small
 * ring and the status, then spent (with the change vs last month), earned (with the net), the
 * daily allowance and the projected end of month. One row, no cards.
 */
export function BudgetSummaryBand({
  budgeted,
  spent,
  earned,
  pace,
  change,
  money,
}: {
  budgeted: number;
  spent: number;
  earned: number;
  pace: BudgetPace;
  /** From `spendingChange`; null while loading or when last month had no spending. */
  change: number | null;
  money: Money;
}) {
  const status = budgetStatus(budgeted, spent);
  const display = BUDGET_STATUS_DISPLAY[status];
  const percent = budgetProgressPercent(budgeted, spent);
  const hasBudget = budgeted > 0;
  const remaining = budgeted - spent;
  const net = earned - spent;
  const amount = (value: number, className?: string) => (
    <AmountDisplay amount={value} className={className} {...money} />
  );
  const projectedOver = hasBudget && pace.projectedSpend !== null && pace.projectedSpend > budgeted;

  return (
    <KpiStrip
      label="Month at a glance"
      className={BUDGET_BAND_CELL}
      lead={
        <div className="flex h-full items-center gap-4">
          <ProgressRing
            percent={percent}
            tone={display.tone}
            size={56}
            label={hasBudget ? `${percent}% of the monthly limit spent` : "No monthly limit set"}
          >
            {hasBudget ? `${percent}%` : "—"}
          </ProgressRing>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {hasBudget ? (remaining < 0 ? "Over by" : "Remaining") : "Monthly limit"}
              {hasBudget || spent > 0 ? (
                <Badge className={cn("border-0", display.badgeClassName)}>{display.label}</Badge>
              ) : null}
            </div>
            <div
              className={cn(
                "truncate text-lg font-semibold tracking-tight",
                hasBudget && remaining < 0 && "text-destructive",
              )}
            >
              {hasBudget ? amount(Math.abs(remaining)) : "Not set"}
              {hasBudget ? (
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                  of {amount(budgeted)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      }
      items={[
        {
          label: "Spent",
          value: amount(spent),
          hint:
            change === null ? (
              "Expenses this month"
            ) : (
              <span
                className={cn(
                  change > 0 && "text-destructive",
                  change < 0 && "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {change > 0 ? "+" : ""}
                {formatNumber(change, money.language, { maximumFractionDigits: 1 })}% vs last month
              </span>
            ),
        },
        {
          label: "Earned",
          value: amount(earned),
          hint: (
            <>
              {net >= 0 ? "Saved " : "Overspent by "}
              <AmountDisplay amount={Math.abs(net)} kind="neutral" showSign={false} {...money} />
            </>
          ),
        },
        {
          label: "Per day left",
          value: pace.perDayLeft === null || !hasBudget ? "—" : amount(pace.perDayLeft),
          hint:
            pace.phase === "current"
              ? `${pace.daysLeft} ${pace.daysLeft === 1 ? "day" : "days"} left`
              : pace.phase === "future"
                ? "Month not started"
                : "Month is over",
        },
        {
          label: "Projected",
          value:
            pace.projectedSpend === null
              ? "—"
              : amount(pace.projectedSpend, projectedOver ? "text-destructive" : undefined),
          hint: !hasBudget
            ? "At the current pace"
            : projectedOver
              ? "Over the limit"
              : "Within the limit",
        },
      ]}
    />
  );
}

/** Loading twin of `BudgetSummaryBand`: same strip, lead and cell heights. */
export function BudgetSummaryBandSkeleton() {
  return (
    <KpiStripSkeleton
      count={FIGURES}
      label="Loading month summary"
      className={BUDGET_BAND_CELL}
      lead={
        <div className="flex h-full items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-36" />
          </div>
        </div>
      }
    />
  );
}
