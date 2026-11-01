"use client";

import { ArrowLeftRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  ListTransactionsQuery,
  SortDirection,
  TransactionFeedRow,
  TransactionSortField,
} from "@luraba/contracts";
import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageSection } from "@/components/finance/page-section";
import { LoadingRegion } from "@/components/states";
import { getTransactionsTableColumns } from "@/components/tables/transactions/transactions-table.config";
import { useDataTable } from "@/hooks/use-data-table";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

/** Rows per page, and rows the skeleton draws, so the card keeps its height while loading. */
export const SCOPED_TRANSACTIONS_PAGE_SIZE = 10;
const COLUMN_WIDTHS = ["20rem", "8rem", "12rem", "8rem", "10rem", "3rem"];

export interface ScopedTransactionsTableProps {
  /** The fixed scope (a card, an invoice, a month). Memoize it: it is part of the query key. */
  filters: Partial<ListTransactionsQuery>;
  lookups: TransactionLookups;
  language: string;
  onView: (row: TransactionFeedRow) => void;
  title?: string;
  description?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** The scope matches nothing by definition (no invoice): show the empty state without a request. */
  scopeEmpty?: boolean;
  /** A hairline above the section when it follows other content. */
  divider?: boolean;
}

/**
 * The transactions table (same columns and row rendering as `/transactions`) for a fixed scope,
 * with its own page and sort state instead of the URL. Used where a page shows "the transactions
 * of X": the credit card overview and an invoice. It brings its section header (no card), loading skeleton,
 * retryable error and empty state.
 */
export function ScopedTransactionsTable({
  filters,
  lookups,
  language,
  onView,
  title = "Transactions",
  description,
  emptyTitle = "No transactions",
  emptyDescription = "Nothing matches this period.",
  scopeEmpty = false,
  divider = false,
}: ScopedTransactionsTableProps) {
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(SCOPED_TRANSACTIONS_PAGE_SIZE);
  const [sort, setSort] = React.useState<TransactionSortField | undefined>("purchaseDate");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  // A new scope starts on the first page.
  const scopeKey = JSON.stringify(filters);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the scope changes
  React.useEffect(() => setPage(1), [scopeKey]);

  const query = useTransactionsQuery(
    {
      ...filters,
      page,
      perPage,
      sort,
      sortDirection,
    } as ListTransactionsQuery,
    { enabled: !scopeEmpty },
  );
  const rows = React.useMemo(() => query.data?.data ?? [], [query.data]);
  const pagination = query.data?.meta.pagination;
  const columns = React.useMemo(
    () => getTransactionsTableColumns({ language, lookups }),
    [language, lookups],
  );
  const { table } = useDataTable({
    data: rows,
    columns,
    page,
    perPage,
    pageCount: pagination?.totalPages ?? 0,
    sort,
    sortDirection,
    onPageChange: setPage,
    onPerPageChange: (next) => {
      setPerPage(next);
      setPage(1);
    },
    onSortChange: (field, direction) => {
      setSort(field as TransactionSortField | undefined);
      setSortDirection(direction ?? "asc");
    },
    getRowId: (row) => row.rowId,
  });

  let body: React.ReactNode;
  if (scopeEmpty) {
    body = (
      <EmptyState
        variant="embedded"
        icon={<HugeiconsIcon icon={ArrowLeftRightIcon} strokeWidth={1.8} className="size-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  } else if (query.isPending) {
    body = <ScopedTransactionsTableBody />;
  } else if (query.isError) {
    body = (
      <ErrorState
        title="Couldn't load transactions"
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        variant="embedded"
        icon={<HugeiconsIcon icon={ArrowLeftRightIcon} strokeWidth={1.8} className="size-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  } else {
    body = (
      <DataTable
        table={table}
        onRowClick={(row) => onView(row.original)}
        totalCount={pagination?.totalCount}
        pageSizeOptions={[10, 20, 50]}
      />
    );
  }

  return (
    <PageSection divider={divider} title={title} description={description}>
      {body}
    </PageSection>
  );
}

function ScopedTransactionsTableBody() {
  return (
    <LoadingRegion label="Loading transactions">
      <DataTableSkeleton
        columnCount={COLUMN_WIDTHS.length}
        rowCount={SCOPED_TRANSACTIONS_PAGE_SIZE}
        withToolbar={false}
        cellWidths={COLUMN_WIDTHS}
      />
    </LoadingRegion>
  );
}

/** Loading twin of `ScopedTransactionsTable`: same section header and table skeleton. */
export function ScopedTransactionsTableSkeleton({
  title = "Transactions",
  divider = false,
}: {
  title?: string;
  divider?: boolean;
}) {
  return (
    <PageSection divider={divider} title={title}>
      <ScopedTransactionsTableBody />
    </PageSection>
  );
}
