import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function GoalDetailLoading() {
  return (
    <InternalPageLayout
      title="Goal"
      subtitle="Progress, monthly plan and contributions."
      back={{ href: "/goals", label: "Goals" }}
    >
      <div className="space-y-5">
        <Skeleton className="h-40 rounded-xl" />
        <KpiGridSkeleton columns={4} withDescription label="Loading goal" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </InternalPageLayout>
  );
}
