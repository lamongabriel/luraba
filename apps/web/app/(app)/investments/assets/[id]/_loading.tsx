import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function InvestmentAssetDetailLoading() {
  return (
    <InternalPageLayout
      title="Asset"
      subtitle="Price, position and activity."
      back={{ href: "/investments/holdings", label: "Holdings" }}
    >
      <div className="space-y-5">
        <KpiGridSkeleton columns={4} label="Loading asset" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </InternalPageLayout>
  );
}
