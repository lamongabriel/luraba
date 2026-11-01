"use client";

import { ArrowUpRight01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import {
  AccountCashFlowChart,
  AccountExpenseBreakdownChart,
} from "@/components/accounts/account-charts";
import { AccountCreditCards } from "@/components/accounts/account-credit-cards";
import {
  ACCOUNT_MAIN_COLUMN,
  ACCOUNT_PAGE_GRID,
  ACCOUNT_SIDE_COLUMN,
  ACCOUNT_STAT_COUNT,
} from "@/components/accounts/account-detail-layout";
import { AccountDetailsSection } from "@/components/accounts/account-details-section";
import { AccountLoanOutlook } from "@/components/accounts/account-loan-outlook";
import { AccountOverview } from "@/components/accounts/account-overview";
import { AccountRecentTransactions } from "@/components/accounts/account-recent-transactions";
import { AccountSheet } from "@/components/accounts/account-sheet";
import { AccountStats } from "@/components/accounts/account-stats";
import { AccountTopMerchants } from "@/components/accounts/account-top-merchants";
import { AccountUpcoming } from "@/components/accounts/account-upcoming";
import { AccountMark, getAccountFullDetail } from "@/components/display";
import { PeriodFilter, usePeriodFilter } from "@/components/filters/period-filter";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { KpiStripSkeleton } from "@/components/kpi";
import { PERMISSIONS, PermissionButton, ResourceAccessBoundary } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAccountInsightsQuery, useAccountQuery } from "@/queries/accounts/use-accounts-query";
import { useUpcomingTransactionsQuery } from "@/queries/transactions/use-transaction-analytics-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

import { AccountDetailsError } from "./_error";
import { AccountDetailsLoading } from "./_loading";

export default function AccountDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const accountQuery = useAccountQuery(id);
  const account = accountQuery.data;
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const precisionFor = useCurrencyPrecision();
  const { selection, selectPeriod, selectRange } = usePeriodFilter();
  const range = { dateFrom: selection.dateFrom, dateTo: selection.dateTo };
  const insightsQuery = useAccountInsightsQuery(id, range, { enabled: Boolean(account) });
  const upcomingQuery = useUpcomingTransactionsQuery(
    { accountIds: [id], perPage: 100 },
    { enabled: Boolean(account) },
  );
  usePageTitle(account?.name);

  if (accountQuery.isPending) {
    return <AccountDetailsLoading />;
  }

  const precision = precisionFor(account?.currencyCode ?? "");
  const upcomingRows = (upcomingQuery.data?.data ?? []).filter(
    (row) => row.currencyCode === account?.currencyCode,
  );
  const upcomingTotal = upcomingRows.reduce((total, row) => total + row.amount, 0);
  const insights = insightsQuery.data;
  const chartStatus = insightsQuery.isError ? "error" : insights ? "ready" : "loading";
  const chartProps = {
    insights,
    status: chartStatus,
    errorMessage: insightsQuery.error?.message,
    onRetry: () => void insightsQuery.refetch(),
    currencyCode: account?.currencyCode ?? "",
    language,
    precision,
  } as const;
  const retryInsights = () => void insightsQuery.refetch();

  return (
    <ResourceAccessBoundary
      error={accountQuery.error}
      resourceName="account"
      backHref="/accounts"
      fallback={
        <AccountDetailsError
          message={accountQuery.error?.message || "We couldn't load this account right now."}
          onRetry={() => void accountQuery.refetch()}
        />
      }
    >
      {account ? (
        <InternalPageLayout
          title={account.name}
          leading={<AccountMark account={account} size="lg" />}
          subtitle={getAccountFullDetail(account)}
          back={{ href: "/accounts", label: "Accounts" }}
          actions={
            <>
              {account.type === "investment" ? (
                <Button asChild variant="outline">
                  <Link href={`/investments/accounts/${account.id}`}>
                    Open in Investments
                    <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
                  </Link>
                </Button>
              ) : null}
              <PeriodFilter
                selection={selection}
                language={language}
                onPeriodChange={selectPeriod}
                onRangeChange={selectRange}
              />
              <PermissionButton
                permission={PERMISSIONS.ACCOUNTS_UPDATE}
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                Edit
              </PermissionButton>
            </>
          }
        >
          <AccountSheet
            account={account}
            open={editOpen}
            onOpenChange={setEditOpen}
            defaultCurrencyCode={account.currencyCode}
            onDeleted={() => router.replace("/accounts")}
          />

          <div className={ACCOUNT_PAGE_GRID}>
            <div className={ACCOUNT_MAIN_COLUMN}>
              <AccountOverview
                account={account}
                insights={insights}
                status={chartStatus}
                errorMessage={insightsQuery.error?.message}
                onRetry={retryInsights}
                language={language}
                precision={precision}
              />

              {insights ? (
                <AccountStats
                  account={account}
                  insights={insights}
                  upcomingTotal={upcomingTotal}
                  language={language}
                  precision={precision}
                />
              ) : insightsQuery.isError ? null : (
                <KpiStripSkeleton count={ACCOUNT_STAT_COUNT} />
              )}

              <AccountCashFlowChart {...chartProps} />

              <AccountRecentTransactions
                accountId={account.id}
                dateFrom={selection.dateFrom}
                dateTo={selection.dateTo}
                language={language}
              />
            </div>

            <aside className={ACCOUNT_SIDE_COLUMN} aria-label="Account details">
              <AccountCreditCards account={account} language={language} precision={precision} />
              <AccountLoanOutlook account={account} language={language} precision={precision} />
              <AccountExpenseBreakdownChart {...chartProps} />
              <AccountTopMerchants
                insights={insights}
                isPending={insightsQuery.isPending}
                error={insightsQuery.error}
                onRetry={retryInsights}
                currencyCode={account.currencyCode}
                language={language}
                precision={precision}
              />
              <AccountUpcoming
                rows={upcomingRows}
                isPending={upcomingQuery.isPending}
                error={upcomingQuery.error}
                onRetry={() => void upcomingQuery.refetch()}
                language={language}
                precision={precision}
              />
            </aside>
          </div>

          <AccountDetailsSection account={account} language={language} />
        </InternalPageLayout>
      ) : null}
    </ResourceAccessBoundary>
  );
}
