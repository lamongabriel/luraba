"use client";

import { MAX_PER_PAGE } from "@luraba/contracts";
import * as React from "react";

import { BudgetsSection } from "@/components/budgets/budgets-section";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MonthSelector } from "@/components/finance/month-selector";
import { PageSection } from "@/components/finance/page-section";
import { GoalSheet } from "@/components/goals/goal-sheet";
import { GoalsEmpty } from "@/components/goals/goals-empty";
import { GoalsError } from "@/components/goals/goals-error";
import { Can, PERMISSIONS, PermissionButton } from "@/components/permissions";
import { LeftToSpend } from "@/components/plan/left-to-spend";
import { PlanBills, PlanBillsSkeleton } from "@/components/plan/plan-bills";
import { PlanGoals, PlanGoalsSkeleton } from "@/components/plan/plan-goals";
import { PLAN_SECTIONS } from "@/components/plan/plan-layout";
import { DataBoundary } from "@/components/states";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useDisclosure } from "@/hooks/use-disclosure";
import { currentMonthKey, formatMonthKeyLabel } from "@/lib/credit-card-invoices";
import { useAccountsQuery } from "@/queries/accounts/use-accounts-query";
import { useGoalsQuery } from "@/queries/goals/use-goals-queries";
import { useSafeToSpendQuery } from "@/queries/monthly-plans/use-safe-to-spend-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { PlanEmpty } from "./_empty";
import { PlanError } from "./_error";
import { PlanLoading } from "./_loading";

export default function PlanPage() {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  const goalSheet = useDisclosure();
  const [month, setMonth] = React.useState(() => currentMonthKey(timezone));

  const plan = useSafeToSpendQuery(month);
  const goalsQuery = useGoalsQuery({ perPage: MAX_PER_PAGE });
  const accountsQuery = useAccountsQuery({ perPage: MAX_PER_PAGE });
  const goals = goalsQuery.data?.data ?? [];
  const data = plan.data;
  const monthLabel = formatMonthKeyLabel(month, language);

  return (
    <InternalPageLayout
      title="Budgets & goals"
      subtitle="How much you can still spend, what you are saving toward and where the month stands."
      actions={<MonthSelector value={month} onChange={setMonth} language={language} />}
    >
      <div className={PLAN_SECTIONS}>
        <PageSection
          title="Left to spend"
          description={`${monthLabel} in cash, and next month on the credit card. Each currency on its own.`}
        >
          <DataBoundary
            isPending={plan.isPending}
            isError={plan.isError}
            isEmpty={data?.currencies.length === 0}
            loading={<PlanLoading />}
            errorState={
              <PlanError message={plan.error?.message} onRetry={() => void plan.refetch()} />
            }
            empty={<PlanEmpty />}
          >
            {data ? <LeftToSpend data={data} language={language} /> : null}
          </DataBoundary>
        </PageSection>

        <PageSection
          title="Goals"
          divider
          description="Planned against contributed this month, and where the money sits."
          actions={
            <PermissionButton
              permission={PERMISSIONS.GOALS_CREATE}
              deniedMessage="Your household role cannot create goals."
              onClick={goalSheet.onOpen}
              size="sm"
            >
              New goal
            </PermissionButton>
          }
        >
          <DataBoundary
            isPending={goalsQuery.isPending || plan.isPending}
            isError={goalsQuery.isError || plan.isError}
            isEmpty={goals.length === 0}
            loading={<PlanGoalsSkeleton />}
            errorState={
              <GoalsError
                message={(goalsQuery.error ?? plan.error)?.message}
                onRetry={() => {
                  void goalsQuery.refetch();
                  void plan.refetch();
                }}
              />
            }
            empty={<GoalsEmpty onCreate={goalSheet.onOpen} />}
          >
            {data ? (
              <PlanGoals
                goals={goals}
                plan={data}
                accounts={accountsQuery.data?.data}
                precisionOf={precisionOf}
                language={language}
              />
            ) : null}
          </DataBoundary>
        </PageSection>

        <Can permission={PERMISSIONS.BUDGETS_READ} fallback={null}>
          <div className="border-t border-border/60 pt-5">
            <BudgetsSection month={month} />
          </div>
        </Can>

        <PageSection
          title="Fixed bills"
          divider
          description="Unpaid occurrences that are part of the maths above."
        >
          <DataBoundary
            isPending={plan.isPending}
            isError={plan.isError}
            loading={<PlanBillsSkeleton />}
            errorState={
              <PlanError message={plan.error?.message} onRetry={() => void plan.refetch()} />
            }
          >
            {data ? <PlanBills plan={data} precisionOf={precisionOf} language={language} /> : null}
          </DataBoundary>
        </PageSection>
      </div>
      <GoalSheet open={goalSheet.isOpen} onOpenChange={goalSheet.setIsOpen} />
    </InternalPageLayout>
  );
}
