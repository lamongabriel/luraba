"use client";

import { ErrorState } from "@/components/error-state";
import {
  ScopedTransactionsTable,
  type ScopedTransactionsTableProps,
  ScopedTransactionsTableSkeleton,
} from "@/components/tables/transactions/scoped-transactions-table";
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query";

/**
 * `ScopedTransactionsTable` that loads the lookups (accounts, categories, merchants...) the table
 * columns need first, with the table skeleton while they load and a retryable error if they fail.
 * Used for a month's card purchases and for one invoice's expenses.
 */
export function CardPurchasesTable(props: Omit<ScopedTransactionsTableProps, "lookups">) {
  const lookupsQuery = useTransactionLookupsQuery();

  if (lookupsQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load transactions"
        description={lookupsQuery.error.message}
        onRetry={() => void lookupsQuery.refetch()}
      />
    );
  }
  if (!lookupsQuery.data)
    return <ScopedTransactionsTableSkeleton title={props.title} divider={props.divider} />;

  return <ScopedTransactionsTable {...props} lookups={lookupsQuery.data} />;
}
