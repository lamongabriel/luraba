import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function TaxesLoading() {
  return (
    <div className="space-y-4">
      <KpiGridSkeleton columns={4} withDescription label="Loading tax report" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
