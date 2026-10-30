import { TableSkeleton } from "@/components/states";

export function HoldingsLoading() {
  return <TableSkeleton columns={5} rows={8} label="Loading holdings" />;
}
