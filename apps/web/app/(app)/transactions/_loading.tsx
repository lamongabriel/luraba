import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";

/** Rows per page by default (`useTransactionParams` `defaultPerPage`). */
const SKELETON_ROWS = 20;

/**
 * Loading twin of the transactions table: the toolbar row (search, date chip, filters, columns), the table and its
 * pager, filling the same height as the loaded table so nothing moves when data arrives.
 */
export function TransactionsLoading() {
  return (
    <LoadingRegion label="Loading transactions" className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-7 min-w-56 flex-1 sm:max-w-xs" />
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="ml-auto h-7 w-24" />
      </div>
      <DataTableSkeleton
        columnCount={6}
        rowCount={SKELETON_ROWS}
        withToolbar={false}
        fill
        mobileList={{ grouped: true }}
        cellWidths={["20rem", "8rem", "12rem", "8rem", "10rem", "3rem"]}
      />
    </LoadingRegion>
  );
}
