import { EntityCardGridSkeleton } from "@/components/states";

export function BillsLoading() {
  return <EntityCardGridSkeleton count={4} label="Loading bills" />;
}
