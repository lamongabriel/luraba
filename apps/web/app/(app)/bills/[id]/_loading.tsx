import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { KpiGridSkeleton } from "@/components/kpi";
import { Skeleton } from "@/components/ui/skeleton";

export function BillDetailLoading() {
  return (
    <InternalPageLayout
      title="Bill"
      subtitle="Schedule, upcoming occurrences and payment history."
      back={{ href: "/bills", label: "Bills" }}
    >
      <div className="space-y-5">
        <KpiGridSkeleton columns={4} withDescription label="Loading bill" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </InternalPageLayout>
  );
}

/** The payments list under the bill's KPIs while its occurrences load. */
export function BillPaymentsLoading() {
  return <Skeleton role="status" aria-label="Loading payments" className="h-24 rounded-xl" />;
}
