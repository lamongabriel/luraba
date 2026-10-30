import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function InvestmentsLoading() {
  return (
    <div className="space-y-3">
      <KpiGridSkeleton columns={4} label="Loading investments" />
      <KpiGridSkeleton columns={4} withDescription label="Loading performance" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
