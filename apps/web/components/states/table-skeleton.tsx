import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { LoadingRegion } from "./skeletons";

/** Loading twin of a plain table card (header row + rows, no toolbar), optionally with a pager. */
export function TableSkeleton({
  columns,
  rows = 8,
  withPagination = false,
  label = "Loading",
}: {
  columns: number;
  rows?: number;
  withPagination?: boolean;
  label?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <DataTableSkeleton
        columnCount={columns}
        rowCount={rows}
        withToolbar={false}
        withPagination={withPagination}
      />
    </LoadingRegion>
  );
}
