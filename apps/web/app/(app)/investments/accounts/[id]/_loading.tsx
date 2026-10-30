import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function InvestmentAccountDetailLoading() {
  return (
    <InternalPageLayout
      title="Account"
      subtitle="Balance, positions and activity."
      back={{ href: "/investments/accounts", label: "Accounts" }}
    >
      <div className="space-y-5">
        <KpiGridSkeleton columns={3} label="Loading account" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </InternalPageLayout>
  );
}
