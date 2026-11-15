import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { KpiGridSkeleton } from "@/components/kpi";
import { ListSkeleton } from "@/components/lists";
import { Skeleton } from "@/components/ui/skeleton";

export function PiggyBankDetailLoading() {
  return (
    <InternalPageLayout
      title="Piggy bank"
      subtitle="Balance, interest and movements."
      back={{ href: "/piggy-banks", label: "Piggy banks" }}
    >
      <div className="space-y-5">
        <KpiGridSkeleton columns={4} withDescription label="Loading piggy bank" />
        <Skeleton className="h-80 rounded-xl" />
        <ListSkeleton rows={10} />
      </div>
    </InternalPageLayout>
  );
}
