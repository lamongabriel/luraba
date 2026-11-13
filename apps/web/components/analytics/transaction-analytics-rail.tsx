"use client";

import type { ListResponse, TransactionAnalytics, UpcomingTransaction } from "@luraba/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  ExpenseBreakdownPanel,
  ExpenseBreakdownSkeleton,
} from "@/components/analytics/expense-breakdown-panel";
import {
  UpcomingTransactionsPanel,
  UpcomingTransactionsSkeleton,
} from "@/components/analytics/upcoming-transactions-panel";
import { ErrorState } from "@/components/error-state";
import type { AppClientError } from "@/services/error-client";

type AnalyticsQuery = UseQueryResult<TransactionAnalytics, AppClientError>;

/**
 * The right-hand column of the transactions page: the expense breakdown, starting on the KPI row. It is hidden on a
 * phone (the page's summary block already tells the story and the donut is too much for a small screen).
 */
export function TransactionAnalyticsRail({
  analyticsQuery,
  language = "en",
  precision = 2,
}: {
  analyticsQuery: AnalyticsQuery;
  language?: string;
  precision?: number;
}) {
  return (
    <aside className="flex min-w-0 flex-col max-md:hidden" aria-label="Transaction insights">
      {analyticsQuery.isPending ? (
        <ExpenseBreakdownSkeleton />
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
    </aside>
  );
}

type UpcomingQuery = UseQueryResult<ListResponse<UpcomingTransaction>, AppClientError>;

/** Upcoming bills and installments below the table, with its three states. Hidden on a phone. */
export function TransactionUpcomingSection({
  query,
  language = "en",
  precision = 2,
  onSelect,
}: {
  query: UpcomingQuery;
  language?: string;
  precision?: number;
  onSelect?: (row: UpcomingTransaction) => void;
}) {
  return (
    <div className="max-md:hidden">
      {query.isPending ? (
        <UpcomingTransactionsSkeleton />
      ) : query.isError ? (
        <ErrorState
          title="Couldn&apos;t load upcoming transactions"
          description={query.error?.message ?? "Try again to load this section."}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <UpcomingTransactionsPanel
          rows={query.data?.data ?? []}
          language={language}
          precision={precision}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
