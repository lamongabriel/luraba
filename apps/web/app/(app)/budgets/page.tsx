"use client";

import { MAX_PER_PAGE } from "@luraba/contracts";
import { shiftMonthKey } from "@luraba/domain";
import * as React from "react";
import { BudgetEditor } from "@/components/budgets/budget-editor";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MonthSelector } from "@/components/finance/month-selector";
import { DataBoundary } from "@/components/states";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { currentMonthKey } from "@/lib/credit-card-invoices";
import { useMonthlyBudgetQuery } from "@/queries/budgets/use-budgets-queries";
import { useCategoriesQuery } from "@/queries/categories/use-categories-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { BudgetEmpty } from "./_empty";
import { BudgetError } from "./_error";
import { BudgetLoading } from "./_loading";

export default function BudgetPage() {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  const [month, setMonth] = React.useState(() => currentMonthKey(timezone));

  const budgetQuery = useMonthlyBudgetQuery(month);
  const categoriesQuery = useCategoriesQuery({ perPage: MAX_PER_PAGE });

  const error = budgetQuery.error ?? categoriesQuery.error;
  const content = (
    <DataBoundary
      isPending={budgetQuery.isPending || categoriesQuery.isPending}
      isError={budgetQuery.isError || categoriesQuery.isError}
      isEmpty={categoriesQuery.data?.data.length === 0}
      loading={<BudgetLoading />}
      errorState={
        <BudgetError
          message={error?.message}
          onRetry={() => {
            void budgetQuery.refetch();
            void categoriesQuery.refetch();
          }}
        />
      }
      empty={<BudgetEmpty />}
    >
      {budgetQuery.data && categoriesQuery.data ? (
        <BudgetEditor
          key={month}
          month={month}
          previousMonth={shiftMonthKey(month, -1)}
          budget={budgetQuery.data}
          categories={categoriesQuery.data.data}
          precision={precisionOf(budgetQuery.data.budgetCurrencyCode)}
          language={language}
        />
      ) : null}
    </DataBoundary>
  );

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
