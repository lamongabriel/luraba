import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function IncomeLoading() {
  return (
    <div className="space-y-4">
      <KpiGridSkeleton columns={3} label="Loading income" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
