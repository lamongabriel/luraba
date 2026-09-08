import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

export function TransactionsLoading() {
  return (
    <DataTableSkeleton
      columnCount={6}
      rowCount={8}
      filterCount={4}
      cellWidths={["20rem", "8rem", "12rem", "8rem", "10rem", "3rem"]}
    />
  );
}
