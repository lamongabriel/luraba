import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

import { LoadingRegion } from "./skeletons";

/** Loading twin of a plain table card (header row + rows, no toolbar), optionally with a pager. */
export function TableSkeleton({
  columns,
  rows = 8,
  withPagination = false,
  label = "Loading",
  mobileList,
}: {
  columns: number;
  rows?: number;
  withPagination?: boolean;
  label?: string;
  /** The loaded table is a list below `md`: draw list rows there (see `DataTable mobile`). */
  mobileList?: { grouped?: boolean };
}) {
  return (
    <LoadingRegion label={label}>
      <DataTableSkeleton
        columnCount={columns}
        rowCount={rows}
        withToolbar={false}
        withPagination={withPagination}
        mobileList={mobileList}
      />
    </LoadingRegion>
  );
}
