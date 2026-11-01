"use client";

import type { ListResponse, TransactionAnalytics, UpcomingTransaction } from "@luraba/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { ExpenseBreakdownPanel } from "@/components/analytics/expense-breakdown-panel";
import { UpcomingTransactionsPanel } from "@/components/analytics/upcoming-transactions-panel";
import { ErrorState } from "@/components/error-state";
import { PanelCardSkeleton } from "@/components/states";
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
    <aside className="flex min-w-0 flex-col gap-3" aria-label="Transaction insights">
      {analyticsQuery.isPending ? (
        <PanelCardSkeleton label="Loading expense breakdown" lines={5} />
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
        <PanelCardSkeleton label="Loading upcoming transactions" lines={4} />
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
