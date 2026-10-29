"use client";

import { MAX_PER_PAGE } from "@luraba/contracts";
import { shiftMonthKey } from "@luraba/domain";
import * as React from "react";
import { BudgetEditor } from "@/components/budgets/budget-editor";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MonthSelector } from "@/components/finance/month-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { currentMonthKey } from "@/lib/credit-card-invoices";
import { useMonthlyBudgetQuery } from "@/queries/budgets/use-budgets-queries";
import { useCategoriesQuery } from "@/queries/categories/use-categories-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

export default function BudgetPage() {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  const [month, setMonth] = React.useState(() => currentMonthKey(timezone));

  const budgetQuery = useMonthlyBudgetQuery(month);
  const categoriesQuery = useCategoriesQuery({ perPage: MAX_PER_PAGE });

  let content: React.ReactNode;

  if (budgetQuery.isPending || categoriesQuery.isPending) {
    content = (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {["a", "b", "c"].map((key) => (
            <Skeleton key={key} className="h-24 rounded-xl bg-muted/50" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl bg-muted/50" />
      </div>
    );
  } else if (budgetQuery.isError || categoriesQuery.isError) {
    const error = budgetQuery.error ?? categoriesQuery.error;
    content = (
      <ErrorState
        title="Couldn't load this budget"
        description={error?.message || "An unexpected error occurred while loading this page."}
        onRetry={() => {
          void budgetQuery.refetch();
          void categoriesQuery.refetch();
        }}
      />
    );
  } else {
    content = (
      <BudgetEditor
        key={month}
        month={month}
        previousMonth={shiftMonthKey(month, -1)}
        budget={budgetQuery.data}
        categories={categoriesQuery.data.data}
        precision={precisionOf(budgetQuery.data.budgetCurrencyCode)}
        language={language}
      />
    );
  }

  return (
    <InternalPageLayout
      title="Budget"
      subtitle="Give every bit of income a job: plan each month by category and watch how it goes."
      actions={<MonthSelector value={month} onChange={setMonth} language={language} />}
    >
      {content}
    </InternalPageLayout>
  );
}
