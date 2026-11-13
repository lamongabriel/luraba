import type * as React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";

/** Rows per page by default (`useTransactionParams` `defaultPerPage`). */
const SKELETON_ROWS = 20;

/** The table's skeleton: the same columns, row heights and pager as the loaded table. */
export function TransactionsTableLoading() {
  return (
    <DataTableSkeleton
      columnCount={6}
      rowCount={SKELETON_ROWS}
      withToolbar={false}
      mobileList={{ grouped: true }}
      cellWidths={["20rem", "8rem", "12rem", "8rem", "10rem", "3rem"]}
    />
  );
}

/**
 * Loading twin of the whole transactions list (toolbar row + table), shown while the lookups load. `dateFilter` is
 * the real, already usable date chip: the fixed date filter never disappears while data loads. On a phone the toolbar
 * row is only the search.
 */
export function TransactionsLoading({ dateFilter }: { dateFilter?: React.ReactNode }) {
  return (
    <LoadingRegion label="Loading transactions" className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 max-md:flex-nowrap md:flex-wrap">
        <Skeleton className="h-7 min-w-56 flex-1 sm:max-w-xs max-md:min-w-0" />
        <div className="max-md:hidden">{dateFilter ?? <Skeleton className="h-7 w-56" />}</div>
        <Skeleton className="h-7 w-24 max-md:hidden" />
      </div>
      <TransactionsTableLoading />
    </LoadingRegion>
  );
}
