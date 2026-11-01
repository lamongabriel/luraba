import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function BudgetLoading() {
  return (
    <div className="space-y-5">
      <KpiGridSkeleton columns={3} withDescription label="Loading budget" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
