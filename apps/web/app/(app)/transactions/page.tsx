"use client";

import { Add01Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  TransactionAnalyticsQuery,
  TransactionFeedRow,
  UpcomingTransaction,
} from "@luraba/contracts";
import { useRouter } from "next/navigation";
import * as React from "react";
import { TransactionsError } from "@/app/(app)/transactions/_error";
import { TransactionsLoading } from "@/app/(app)/transactions/_loading";
import {
  TransactionAnalyticsRail,
  TransactionUpcomingSection,
} from "@/components/analytics/transaction-analytics-rail";
import { TransactionAnalyticsSummary } from "@/components/analytics/transaction-analytics-summary";
import { UPCOMING_ROWS } from "@/components/analytics/upcoming-transactions-panel";
import { DateFilterChip } from "@/components/filters";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { PageHeaderIconButton } from "@/components/finance/page-header";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { TransactionsTable } from "@/components/tables/transactions/transactions-table";
import { DeleteTransactionModal } from "@/components/transactions/delete-transaction-modal";
import {
  TransactionSheet,
  type TransactionSheetMode,
} from "@/components/transactions/transaction-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import {
  useTransactionAnalyticsQuery,
  useUpcomingTransactionsQuery,
} from "@/queries/transactions/use-transaction-analytics-query";
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

export default function TransactionsPage() {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const router = useRouter();
  const params = useTransactionParams();
  const lookupsQuery = useTransactionLookupsQuery();
  const analyticsFilters = React.useMemo(() => {
    const {
      page: _page,
      perPage: _perPage,
      sort: _sort,
      sortDirection: _sortDirection,
      ...filters
    } = params.apiParams;
    return filters as TransactionAnalyticsQuery;
  }, [params.apiParams]);
  const upcomingFilters = React.useMemo(() => {
    const {
      dateFrom: _dateFrom,
      dateTo: _dateTo,
      purchaseDateFrom: _purchaseDateFrom,
      purchaseDateTo: _purchaseDateTo,
      ...filters
    } = analyticsFilters;
    return {
      ...filters,
      page: 1,
      perPage: UPCOMING_ROWS,
      sort: "effectiveDate" as const,
      sortDirection: "asc" as const,
    };
  }, [analyticsFilters]);
  const analyticsQuery = useTransactionAnalyticsQuery(analyticsFilters, {
    enabled: params.ready,
  });
  const isMobile = useIsMobile();
  // The upcoming section is not shown on a phone, so it is not fetched there either.
  const upcomingQuery = useUpcomingTransactionsQuery(upcomingFilters, {
    enabled: params.ready && !isMobile,
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<TransactionSheetMode>("create");
  const [selectedRow, setSelectedRow] = React.useState<TransactionFeedRow | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const openCreate = React.useCallback(() => {
    setSelectedRow(null);
    setSheetMode("create");
    setSheetOpen(true);
  }, []);

  const openRow = React.useCallback((row: TransactionFeedRow, mode: TransactionSheetMode) => {
    setSelectedRow(row);
    setSheetMode(mode);
    setSheetOpen(true);
  }, []);

  const openDelete = React.useCallback((row: TransactionFeedRow) => {
    setSelectedRow(row);
    setDeleteOpen(true);
  }, []);

  // After a save the list refetches; swap the open row for its fresh copy so the details update.
  const syncSelectedRow = React.useCallback((rows: TransactionFeedRow[]) => {
    setSelectedRow((current) =>
      current ? (rows.find((row) => row.rowId === current.rowId) ?? current) : current,
    );
  }, []);

  const openUpcoming = React.useCallback(
    (row: UpcomingTransaction) => {
      if (row.sourceType === "bill_occurrence") {
        router.push(`/bills/${row.parentId}`);
        return;
      }
      const feedRow: TransactionFeedRow = {
        id: row.parentId,
        type: "expense",
        description: row.description,
        originalDescription: null,
        notes: null,
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
        refund: null,
        includeInBudget: true,
        purchaseDate: row.effectiveDate,
        postedDate: row.effectiveDate,
        createdByUserId: null,
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
      };
      openRow(feedRow, "view");
    },
    [openRow, router],
  );

  const precision =
    lookupsQuery.data?.currencies.find(
      (currency) => currency.code === analyticsQuery.data?.currencyCode,
    )?.precision ?? 2;

  const dateChip = <DateFilterChip date={params.date} />;
  const tableContent = lookupsQuery.isPending ? (
    <TransactionsLoading dateFilter={dateChip} />
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
      onRows={syncSelectedRow}
      onView={(row) => openRow(row, "view")}
      mobileFiltersOpen={mobileFiltersOpen}
      onMobileFiltersOpenChange={setMobileFiltersOpen}
      params={params}
    />
  );

  return (
    <InternalPageLayout
      title="Transactions"
      subtitle="Every purchase, payment and transfer across your accounts and cards."
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
      mobileActions={
        <>
          <PageHeaderIconButton
            label="Filters"
            icon={<HugeiconsIcon icon={FilterIcon} strokeWidth={2} />}
            badge={params.filters.activeCount}
            disabled={lookupsQuery.isPending}
            onClick={() => setMobileFiltersOpen(true)}
          />
          <PermissionButton
            permission={PERMISSIONS.TRANSACTIONS_CREATE}
            deniedMessage="Your household role cannot create transactions."
            whenDenied="hidden"
            size="icon"
            aria-label="Add transaction"
            className="size-9 rounded-full"
            onClick={openCreate}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          </PermissionButton>
        </>
      }
    >
      {/* Desktop: KPIs, table and upcoming on the left; the expense breakdown on the right from the KPI row down.
          Below xl everything stacks in that order. A phone shows the compact summary and the list only. */}
      <div className="grid min-w-0 gap-x-4 gap-y-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 xl:col-start-1">
          <TransactionAnalyticsSummary
            query={analyticsQuery}
            language={language}
            precision={precision}
            mobileAction={dateChip}
          />
        </div>
        <div className="min-w-0 xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:self-start">
          <TransactionAnalyticsRail
            analyticsQuery={analyticsQuery}
            language={language}
            precision={precision}
          />
        </div>
        <div className="min-w-0 xl:col-start-1">{tableContent}</div>
        <div className="min-w-0 xl:col-start-1">
          <TransactionUpcomingSection
            query={upcomingQuery}
            language={language}
            precision={precision}
            onSelect={openUpcoming}
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
        onOpenChange={setDeleteOpen}
        onDeleted={() => setSheetOpen(false)}
        row={selectedRow}
      />
    </InternalPageLayout>
  );
}
