"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { TransactionsError } from "@/app/(app)/transactions/_error"
import { TransactionsLoading } from "@/app/(app)/transactions/_loading"
import { TransactionAnalyticsRail } from "@/components/analytics/transaction-analytics-rail"
import { TransactionAnalyticsSummary } from "@/components/analytics/transaction-analytics-summary"
import { InternalPageLayout } from "@/components/finance/internal-page-layout"
import { PERMISSIONS, PermissionButton } from "@/components/permissions"
import { TransactionsTable } from "@/components/tables/transactions/transactions-table"
import { DeleteTransactionModal } from "@/components/transactions/delete-transaction-modal"
import {
  TransactionSheet,
  type TransactionSheetMode,
} from "@/components/transactions/transaction-sheet"
import { useTransactionParams } from "@/hooks/use-transaction-params"
import type { TransactionAnalyticsHttpQuery } from "@/interfaces/http/transactions-http"
import type {
  TransactionFeedRow,
  UpcomingTransaction,
} from "@/interfaces/transaction"
import {
  useTransactionAnalyticsQuery,
  useUpcomingTransactionsQuery,
} from "@/queries/transactions/use-transaction-analytics-query"
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query"
import { useAuthSessionStore } from "@/stores/auth-session-store"

export default function TransactionsPage() {
  const language = useAuthSessionStore(
    (state) => state.user?.preferences.language ?? "en",
  )
  const params = useTransactionParams()
  const lookupsQuery = useTransactionLookupsQuery()
  const analyticsFilters = React.useMemo(() => {
    const {
      page: _page,
      perPage: _perPage,
      sort: _sort,
      sortDirection: _sortDirection,
      ...filters
    } = params.apiParams
    return filters as TransactionAnalyticsHttpQuery
  }, [params.apiParams])
  const upcomingFilters = React.useMemo(() => {
    const {
      dateFrom: _dateFrom,
      dateTo: _dateTo,
      purchaseDateFrom: _purchaseDateFrom,
      purchaseDateTo: _purchaseDateTo,
      ...filters
    } = analyticsFilters
    return {
      ...filters,
      page: 1,
      perPage: 5,
      sort: "effectiveDate" as const,
      sortDirection: "asc" as const,
    }
  }, [analyticsFilters])
  const analyticsQuery = useTransactionAnalyticsQuery(analyticsFilters, {
    enabled: params.ready,
  })
  const upcomingQuery = useUpcomingTransactionsQuery(upcomingFilters, {
    enabled: params.ready,
  })
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] =
    React.useState<TransactionSheetMode>("create")
  const [selectedRow, setSelectedRow] =
    React.useState<TransactionFeedRow | null>(null)
  const [deleteRow, setDeleteRow] = React.useState<TransactionFeedRow | null>(
    null,
  )
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const openCreate = React.useCallback(() => {
    setSelectedRow(null)
    setSheetMode("create")
    setSheetOpen(true)
  }, [])

  const openRow = React.useCallback(
    (row: TransactionFeedRow, mode: TransactionSheetMode) => {
      setSelectedRow(row)
      setSheetMode(mode)
      setSheetOpen(true)
    },
    [],
  )

  const openDelete = React.useCallback((row: TransactionFeedRow) => {
    setDeleteRow(row)
    setSheetOpen(false)
    setDeleteOpen(true)
  }, [])

  const handleDeleteOpenChange = React.useCallback((open: boolean) => {
    setDeleteOpen(open)
    if (!open) setDeleteRow(null)
  }, [])

  const openUpcoming = React.useCallback(
    (row: UpcomingTransaction) => {
      if (row.sourceType === "recurring_bill") {
        window.location.assign(`/recurring-bills?selected=${row.sourceId}`)
        return
      }

      const feedRow: TransactionFeedRow = {
        id: row.parentId,
        type: "expense",
        description: row.description,
        amount: row.amount,
        currencyCode: row.currencyCode,
        toAmount: null,
        toCurrencyCode: null,
        accountId: row.accountId,
        accountName: row.accountName,
        accountClassification: null,
        toAccountId: null,
        toAccountName: null,
        toAccountClassification: null,
        categoryId: row.categoryId,
        merchantId: row.merchantId,
        paymentMethodId: null,
        paymentMethodCode: null,
        paymentMethodName: null,
        paymentMethodScope: null,
        paymentMethodTranslationKey: null,
        tags: [],
        includeInBudget: true,
        purchaseDate: row.effectiveDate,
        postedDate: row.effectiveDate,
        createdAt: row.effectiveDate,
        updatedAt: row.effectiveDate,
        rowId: row.sourceId,
        rowKind: "credit_card_installment",
        originType: "credit_card_installment",
        creditCardId: row.creditCardId,
        purchaseId: row.parentId,
        paymentId: null,
        installmentId: row.sourceId,
        installmentNumber: row.installmentNumber,
        installmentCount: row.installmentCount,
      }
      openRow(feedRow, "view")
    },
    [openRow],
  )

  const precision =
    lookupsQuery.data?.currencies.find(
      (currency) => currency.code === analyticsQuery.data?.currencyCode,
    )?.precision ?? 2

  const tableContent = lookupsQuery.isPending ? (
    <TransactionsLoading />
  ) : lookupsQuery.isError ? (
    <TransactionsError
      message={lookupsQuery.error.message}
      onRetry={() => void lookupsQuery.refetch()}
    />
  ) : (
    <TransactionsTable
      language={language}
      lookups={lookupsQuery.data}
      onCreate={openCreate}
      onView={(row) => openRow(row, "view")}
      params={params}
    />
  )

  return (
    <InternalPageLayout
      title="Transactions"
      actions={
        <PermissionButton
          permission={PERMISSIONS.TRANSACTIONS_CREATE}
          deniedMessage="Your household role cannot create transactions."
          onClick={openCreate}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add transaction
        </PermissionButton>
      }
    >
      <div className="space-y-5">
        <TransactionAnalyticsSummary
          query={analyticsQuery}
          language={language}
          precision={precision}
        />
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div className="min-w-0">{tableContent}</div>
          <TransactionAnalyticsRail
            analyticsQuery={analyticsQuery}
            upcomingQuery={upcomingQuery}
            language={language}
            precision={precision}
            onSelectUpcoming={openUpcoming}
          />
        </div>
      </div>

      {lookupsQuery.data ? (
        <TransactionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode={sheetMode}
          onModeChange={setSheetMode}
          row={selectedRow}
          lookups={lookupsQuery.data}
          onDelete={openDelete}
        />
      ) : null}

      <DeleteTransactionModal
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        row={deleteRow}
      />
    </InternalPageLayout>
  )
}
