"use client";

import type {
  ListTransactionsQuery,
  TransactionFeedRow,
  TransactionSortField,
} from "@luraba/contracts";
import * as React from "react";
import { TransactionsEmpty } from "@/app/(app)/transactions/_empty";
import { TransactionsError } from "@/app/(app)/transactions/_error";
import { TransactionsTableLoading } from "@/app/(app)/transactions/_loading";
import { DataTable } from "@/components/data-table/data-table";
import {
  getTransactionsMobileRow,
  getTransactionsTableColumns,
} from "@/components/tables/transactions/transactions-table.config";
import { TransactionsTableToolbar } from "@/components/tables/transactions/transactions-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import type { useTransactionParams } from "@/hooks/use-transaction-params";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

export function TransactionsTable({
  language,
  lookups,
  onCreate,
  onRows,
  onView,
  mobileFiltersOpen,
  onMobileFiltersOpenChange,
  params,
}: {
  language: string;
  lookups: TransactionLookups;
  onCreate: () => void;
  /** Called with the rows on screen whenever they change, so an open sheet can show fresh data. */
  onRows?: (rows: TransactionFeedRow[]) => void;
  onView: (row: TransactionFeedRow) => void;
  /** The phone Filters drawer, opened from the page header. */
  mobileFiltersOpen: boolean;
  onMobileFiltersOpenChange: (open: boolean) => void;
  params: ReturnType<typeof useTransactionParams>;
}) {
  const queryParams = params.apiParams as ListTransactionsQuery;
  const hasTransactionFilters = params.hasFilters;
  const query = useTransactionsQuery(queryParams, { enabled: params.ready });
  const rows = React.useMemo(() => query.data?.data ?? [], [query.data]);
  React.useEffect(() => {
    if (query.data) onRows?.(query.data.data);
  }, [onRows, query.data]);
  const pagination = query.data?.meta.pagination;
  const columns = React.useMemo(
    () =>
      getTransactionsTableColumns({
        language,
        lookups,
      }),
    [language, lookups],
  );
  const mobile = React.useMemo(
    () => getTransactionsMobileRow({ language, lookups }),
    [language, lookups],
  );
  const { table } = useDataTable({
    data: rows,
    columns,
    page: params.page,
    perPage: params.perPage,
    pageCount: pagination?.totalPages ?? 0,
    sort: params.sort,
    sortDirection: params.sortDirection,
    onPageChange: params.setPage,
    onPerPageChange: params.setPerPage,
    onSortChange: (field, direction) =>
      params.setSorting(field as TransactionSortField | undefined, direction),
    getRowId: (row) => row.rowId,
    // Merchant and Created by are in the Actions > Columns menu; the default six columns fit beside the right column.
    initialState: { columnVisibility: { merchant: false, createdBy: false } },
  });
  const clearFilters = params.clearFilters;

  // The toolbar (and so the fixed date filter) renders in every state; only the body below it changes.
  const body = query.isPending ? (
    <TransactionsTableLoading />
  ) : query.isError ? (
    <TransactionsError message={query.error.message} onRetry={() => void query.refetch()} />
  ) : rows.length === 0 ? (
    <TransactionsEmpty
      hasFilters={hasTransactionFilters}
      onClearFilters={clearFilters}
      onCreate={onCreate}
    />
  ) : (
    <DataTable
      table={table}
      onRowClick={(row) => onView(row.original)}
      mobile={mobile}
      tableClassName="min-w-[38rem]"
      totalCount={pagination?.totalCount}
      pageSizeOptions={[10, 20, 50, 100]}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <TransactionsTableToolbar
        table={table}
        lookups={lookups}
        search={params.search}
        setSearch={params.setSearch}
        filters={params.filters}
        date={params.date}
        mobileFiltersOpen={mobileFiltersOpen}
        onMobileFiltersOpenChange={onMobileFiltersOpenChange}
      />
      {body}
    </div>
  );
}
