import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function SplitDetailLoading() {
  return (
    <InternalPageLayout
      title="Split"
      subtitle="Who owes what, installments and payments."
      back={{ href: "/splits", label: "Splits" }}
    >
      <div className="space-y-5">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </InternalPageLayout>
  );
}
