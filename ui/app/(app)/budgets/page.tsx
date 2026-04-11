"use client";

import * as React from "react";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/finance/empty-state";
import { BudgetAllocationSheet } from "@/components/finance/forms/budget-allocation-sheet";
import { MonthSwitcher } from "@/components/finance/month-switcher";
import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { SegmentedBar } from "@/components/finance/segmented-bar";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { getCurrentMonthKey } from "@/lib/finance";
import { useBudgetQuery } from "@/queries/use-budget.query";
import { useCategoriesQuery } from "@/queries/use-categories.query";
import { useAuthStore } from "@/stores/auth.store";

const CATEGORY_COLORS = ["#0891b2", "#0f766e", "#e11d48", "#f59e0b", "#7c3aed", "#2563eb"];

export default function BudgetsPage() {
  const [month, setMonth] = React.useState(getCurrentMonthKey());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const preferredCurrency = useAuthStore((state) => state.user?.preferences.currency);

  const { data: budget, isLoading, isError } = useBudgetQuery(month, preferredCurrency);
  const { data: categories = [] } = useCategoriesQuery();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Budgets"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthSwitcher month={month} onChange={setMonth} />
            {budget ? (
              <Button className="rounded-full" onClick={() => setSheetOpen(true)}>
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} className="size-4" />
                Edit allocations
              </Button>
            ) : null}
          </div>
        }
      />

      {isLoading ? <Typography variant="body-muted">Loading budget...</Typography> : null}
      {isError ? <Typography variant="small-destructive">Failed to load budget.</Typography> : null}

      {budget ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <SummaryCard
              label="Income budgeted"
              value={<MoneyValue amount={budget.totals.incomeBudgeted} currencyCode={budget.currencyCode} />}
              accent="positive"
            />
            <SummaryCard
              label="Income actual"
              value={<MoneyValue amount={budget.totals.incomeActual} currencyCode={budget.currencyCode} />}
              hint="Includes credit-card budget recognition rules"
              accent="positive"
            />
            <SummaryCard
              label="Expense budgeted"
              value={<MoneyValue amount={budget.totals.expenseBudgeted} currencyCode={budget.currencyCode} />}
              accent="negative"
            />
            <SummaryCard
              label="Expense actual"
              value={<MoneyValue amount={budget.totals.expenseActual} currencyCode={budget.currencyCode} />}
              hint="Current month recognized spending"
              accent="negative"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionPanel title="Income mix" description="How actual income is distributed across the configured categories.">
              {budget.categories.income.length === 0 ? (
                <EmptyState title="No income categories yet" description="Create income categories and budget allocations to build this view." />
              ) : (
                <div className="space-y-5">
                  <SegmentedBar
                    className="h-3"
                    segments={budget.categories.income.map((category, index) => ({
                      label: category.categoryName,
                      value: category.actualAmount,
                      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                    }))}
                  />
                  <div className="space-y-3">
                    {budget.categories.income.map((category, index) => (
                      <div key={category.categoryId} className="rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                            <Typography variant="small-strong">{category.categoryName}</Typography>
                          </div>
                          <MoneyValue amount={category.actualAmount} currencyCode={budget.currencyCode} />
                        </div>
                        <Typography as="div" variant="small-muted" className="mt-2">
                          Budgeted <MoneyValue amount={category.budgetedAmount} currencyCode={budget.currencyCode} />
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionPanel>

            <SectionPanel title="Expense performance" description="Budget versus actual per expense category.">
              {budget.categories.expense.length === 0 ? (
                <EmptyState title="No expense categories yet" description="Create expense categories and set monthly allocations to track performance." />
              ) : (
                <div className="space-y-3">
                  {budget.categories.expense.map((category) => {
                    const overBudget = category.actualAmount > category.budgetedAmount;
                    return (
                      <div key={category.categoryId} className="rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Typography variant="small-strong">{category.categoryName}</Typography>
                            <Typography as="div" variant="small-muted">
                              Budgeted <MoneyValue amount={category.budgetedAmount} currencyCode={budget.currencyCode} />
                            </Typography>
                          </div>
                          <StatusPill tone={overBudget ? "negative" : "positive"}>
                            {overBudget ? "Over" : "On track"}
                          </StatusPill>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <SegmentedBar
                              segments={[
                                { label: "Actual", value: category.actualAmount, color: overBudget ? "#e11d48" : "#0f766e" },
                                {
                                  label: "Remaining",
                                  value: Math.max(category.budgetedAmount - category.actualAmount, 0),
                                  color: "#cbd5e1",
                                },
                              ]}
                            />
                          </div>
                          <div className="font-semibold">
                            <MoneyValue amount={category.actualAmount} currencyCode={budget.currencyCode} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionPanel>
          </div>

          <BudgetAllocationSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            month={month}
            budget={budget}
            categories={categories}
          />
        </>
      ) : (
        <EmptyState
          title="Budget unavailable"
          description="Once the monthly budget endpoint is available for this month and currency, it will appear here."
        />
      )}
    </div>
  );
}
