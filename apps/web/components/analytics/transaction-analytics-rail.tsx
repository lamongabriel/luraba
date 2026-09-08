"use client";

import type { ListResponse, TransactionAnalytics, UpcomingTransaction } from "@luraba/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { ExpenseBreakdownPanel } from "@/components/analytics/expense-breakdown-panel";
import { UpcomingTransactionsPanel } from "@/components/analytics/upcoming-transactions-panel";
import { ErrorState } from "@/components/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppClientError } from "@/services/error-client";

type AnalyticsQuery = UseQueryResult<TransactionAnalytics, AppClientError>;
type UpcomingQuery = UseQueryResult<ListResponse<UpcomingTransaction>, AppClientError>;

export function TransactionAnalyticsRail({
  analyticsQuery,
  upcomingQuery,
  language = "en",
  precision = 2,
  onSelectUpcoming,
}: {
  analyticsQuery: AnalyticsQuery;
  upcomingQuery: UpcomingQuery;
  language?: string;
  precision?: number;
  onSelectUpcoming?: (row: UpcomingTransaction) => void;
}) {
  return (
    <aside className="min-w-0 space-y-3" aria-label="Transaction insights">
      {analyticsQuery.isPending ? (
        <Skeleton className="h-96" aria-label="Loading expense breakdown" />
      ) : analyticsQuery.isError || !analyticsQuery.data ? (
        <ErrorState
          title="Couldn&apos;t load expense breakdown"
          description={analyticsQuery.error?.message ?? "Try again to load this panel."}
          onRetry={() => void analyticsQuery.refetch()}
        />
      ) : (
        <ExpenseBreakdownPanel
          analytics={analyticsQuery.data}
          language={language}
          precision={precision}
        />
      )}

      {upcomingQuery.isPending ? (
        <Skeleton className="h-72" aria-label="Loading upcoming transactions" />
      ) : upcomingQuery.isError ? (
        <ErrorState
          title="Couldn&apos;t load upcoming transactions"
          description={upcomingQuery.error?.message ?? "Try again to load this panel."}
          onRetry={() => void upcomingQuery.refetch()}
        />
      ) : (
        <UpcomingTransactionsPanel
          rows={upcomingQuery.data?.data ?? []}
          language={language}
          precision={precision}
          onSelect={onSelectUpcoming}
        />
      )}
    </aside>
  );
}
