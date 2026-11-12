"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import Link from "next/link";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { TableSkeleton } from "@/components/states";
import {
  getTransactionsMobileRow,
  getTransactionsTableColumns,
} from "@/components/tables/transactions/transactions-table.config";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useDataTable } from "@/hooks/use-data-table";
import { useAccountTransactionsQuery } from "@/queries/accounts/use-accounts-query";
import {
  type TransactionLookups,
  useTransactionLookupsQuery,
} from "@/queries/transactions/use-transaction-lookups-query";

import { ACCOUNT_RECENT_TRANSACTIONS } from "./account-detail-layout";

const NO_LOOKUPS: TransactionLookups = {
  accounts: [],
  creditCards: [],
  categories: [],
  merchants: [],
  tags: [],
  paymentMethods: [],
  currencies: [],
};

/** The account column is redundant on a single account's page; every other column is the shared one. */
function accountColumns(language: string, lookups: TransactionLookups) {
  return getTransactionsTableColumns({ language, lookups }).filter(
    (column) => column.id !== "account",
  );
}

export const ACCOUNT_TRANSACTION_COLUMN_COUNT = accountColumns("en", NO_LOOKUPS).length;

/**
 * The latest transactions of the account in the selected period, in the same table and row
 * rendering as the transactions page, with a link to the full list filtered by this account.
 */
export function AccountRecentTransactions({
  accountId,
  dateFrom,
  dateTo,
  language,
}: {
  accountId: string;
  dateFrom?: string;
  dateTo?: string;
  language: string;
}) {
  const lookupsQuery = useTransactionLookupsQuery();
  const query = useAccountTransactionsQuery(accountId, {
    dateFrom,
    dateTo,
    page: 1,
    perPage: ACCOUNT_RECENT_TRANSACTIONS,
    sort: "postedDate",
    sortDirection: "desc",
  });
  const rows = query.data?.data ?? [];
  const columns = React.useMemo(
    () => accountColumns(language, lookupsQuery.data ?? NO_LOOKUPS),
    [language, lookupsQuery.data],
  );
  const mobile = React.useMemo(
    () =>
      getTransactionsMobileRow({
        language,
        lookups: lookupsQuery.data ?? NO_LOOKUPS,
        showAccount: false,
      }),
    [language, lookupsQuery.data],
  );
  const { table } = useDataTable<TransactionFeedRow>({
    data: rows,
    columns,
    page: 1,
    perPage: ACCOUNT_RECENT_TRANSACTIONS,
    pageCount: 1,
    onPageChange: () => undefined,
    onPerPageChange: () => undefined,
    onSortChange: () => undefined,
    getRowId: (row) => row.rowId,
  });

  const params = new URLSearchParams({ accountIds: accountId });
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  return (
    <section aria-label="Recent transactions" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Typography as="h2" variant="section-title">
            Recent transactions
          </Typography>
          <Typography variant="small-muted">
            {query.data
              ? `${rows.length} of ${query.data.meta.pagination.totalCount} in this period`
              : "Latest activity in this period"}
          </Typography>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/transactions?${params.toString()}`}>
            See all
            <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
          </Link>
        </Button>
      </div>
      {query.isPending || lookupsQuery.isPending ? (
        <TableSkeleton
          columns={ACCOUNT_TRANSACTION_COLUMN_COUNT}
          rows={ACCOUNT_RECENT_TRANSACTIONS}
          label="Loading recent transactions"
          mobileList={{ grouped: true }}
        />
      ) : query.isError || lookupsQuery.isError ? (
        <ErrorState
          title="Couldn't load transactions"
          description={query.error?.message ?? lookupsQuery.error?.message}
          onRetry={() => {
            void query.refetch();
            void lookupsQuery.refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          variant="embedded"
          title="No transactions in this period"
          description="Pick a longer period or record a transaction on this account."
        />
      ) : (
        <DataTable table={table} mobile={mobile} showPagination={false} />
      )}
    </section>
  );
}
