import { TableSkeleton } from "@/components/states";

export function InvestmentTransactionsLoading() {
  return <TableSkeleton columns={8} rows={10} withPagination label="Loading transactions" />;
}
