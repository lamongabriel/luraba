"use client"

import * as React from "react"
import { TransactionsEmpty } from "@/app/(app)/transactions/_empty"
import { TransactionsError } from "@/app/(app)/transactions/_error"
import { TransactionsLoading } from "@/app/(app)/transactions/_loading"
import { DataTable } from "@/components/data-table/data-table"
import { getTransactionsTableColumns } from "@/components/tables/transactions/transactions-table.config"
import type {
  TransactionTableFilters,
  TransactionTableFilterUpdates,
} from "@/components/tables/transactions/transactions-table-filters"
import { TransactionsTableToolbar } from "@/components/tables/transactions/transactions-table-toolbar"
import { useDataTable } from "@/hooks/use-data-table"
import type { useTransactionParams } from "@/hooks/use-transaction-params"
import type { ListTransactionsHttpQuery } from "@/interfaces/http/transactions-http"
import type {
  TransactionFeedRow,
  TransactionSortField,
} from "@/interfaces/transaction"
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query"
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query"

export function TransactionsTable({
  language,
  lookups,
  onCreate,
  onView,
  params,
}: {
  language: string
  lookups: TransactionLookups
  onCreate: () => void
  onView: (row: TransactionFeedRow) => void
  params: ReturnType<typeof useTransactionParams>
}) {
  const queryParams = params.apiParams as ListTransactionsHttpQuery
  const transactionFilters = params.filters as TransactionTableFilters
  const hasTransactionFilters = params.hasFilters
  const query = useTransactionsQuery(queryParams, { enabled: params.ready })
  const rows = query.data?.data ?? []
  const pagination = query.data?.meta.pagination
  const columns = React.useMemo(
    () =>
      getTransactionsTableColumns({
        language,
        lookups,
      }),
    [language, lookups],
  )
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
  })
  const setFilter = React.useCallback(
    (key: keyof TransactionTableFilters, value: unknown) => {
      params.setFilter(key, value as never)
    },
    [params],
  )
  const setFilters = React.useCallback(
    (updates: TransactionTableFilterUpdates) => {
      params.setFilters(updates)
    },
    [params],
  )
  const clearFilters = React.useCallback(() => {
    params.clearFilters()
  }, [params.clearFilters])

  if (query.isPending) return <TransactionsLoading />
  if (query.isError) {
    return (
      <TransactionsError
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <TransactionsTableToolbar
        table={table}
        lookups={lookups}
        search={params.search}
        setSearch={params.setSearch}
        filters={transactionFilters as TransactionTableFilters}
        setFilter={setFilter}
        setFilters={setFilters}
        clearFilters={clearFilters}
        hasFilters={hasTransactionFilters}
      />

      {rows.length === 0 ? (
        <TransactionsEmpty
          hasFilters={hasTransactionFilters}
          onClearFilters={clearFilters}
          onCreate={onCreate}
        />
      ) : (
        <DataTable
          table={table}
          onRowClick={(row) => onView(row.original)}
          totalCount={pagination?.totalCount}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </div>
  )
}
