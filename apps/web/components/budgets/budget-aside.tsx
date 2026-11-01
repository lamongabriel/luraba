"use client";

import type { BudgetInsights } from "@luraba/contracts";
import type * as React from "react";

import { BarChartCard, CHART_SEMANTIC, SegmentedBarCard } from "@/components/charts";
import { BUDGET_ALLOCATION_HEIGHT, BUDGET_TREND_HEIGHT } from "./budget-layout";

type Money = { currencyCode: string; precision: number; language: string };

export type BudgetAllocationSlice = {
  id: string;
  name: string;
  value: number;
  color?: string | null;
};

function RailSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex h-5 items-baseline justify-between gap-2">
        <h3 className="font-heading text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      {children}
    </section>
  );
}

const SWATCH = "mr-1 inline-block size-2 rounded-full align-baseline";

/**
 * The slim rail beside the category list: a small budget-vs-spent trend of the last six months and
 * how the budget is split, both flat on the page. Insights failing only affects the trend.
 */
export function BudgetAside({
  insights,
  isPending,
  isError,
  onRetry,
  allocation,
  money,
}: {
  insights: BudgetInsights | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  allocation: BudgetAllocationSlice[];
  money: Money;
}) {
  const data = (insights?.history ?? []).map((item) => ({
    date: `${item.month}-01`,
    budgeted: item.budgetedAmount,
    spent: item.spentAmount,
  }));
  const hasData = data.some((item) => item.budgeted > 0 || item.spent > 0);

  return (
    <aside aria-label="Budget insights" className="min-w-0 space-y-6 lg:sticky lg:top-6">
      <RailSection
        title="Budget vs spent"
        hint={
          <>
            <span className={SWATCH} style={{ backgroundColor: CHART_SEMANTIC.neutral }} />
            Budget
            <span
              className={`${SWATCH} ml-2`}
              style={{ backgroundColor: CHART_SEMANTIC.negative }}
            />
            Spent
          </>
        }
      >
        <BarChartCard
          flat
          title="Budget vs spent"
          status={isError ? "error" : isPending ? "loading" : "ready"}
          onRetry={onRetry}
          heightClassName={BUDGET_TREND_HEIGHT}
          emptyTitle="No history yet"
          emptyDescription="Budgets and spending from the last months will show up here."
          data={hasData ? data : []}
          series={[{ key: "spent", label: "Spent", color: CHART_SEMANTIC.negative }]}
          lineSeries={[{ key: "budgeted", label: "Budget", color: CHART_SEMANTIC.neutral }]}
          bucket="month"
          {...money}
        />
      </RailSection>
      <div className="border-t border-border/60" />
      <RailSection title="Where the budget goes" hint="Share of the limit">
        <SegmentedBarCard
          flat
          title="Where the budget goes"
          status={isPending && allocation.length === 0 ? "loading" : "ready"}
          heightClassName={BUDGET_ALLOCATION_HEIGHT}
          emptyTitle="No limits yet"
          emptyDescription="Give a category a limit to see how the month is split."
          legendClassName="grid-cols-1"
          data={allocation}
          {...money}
        />
      </RailSection>
    </aside>
  );
}
