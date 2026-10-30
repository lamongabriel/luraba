import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function CreditCardDetailLoading() {
  return (
    <InternalPageLayout
      title="Credit card"
      subtitle="Invoices, limit and the purchases behind each one."
      back={{ href: "/credit-cards", label: "Credit cards" }}
    >
      <div className="space-y-5">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </InternalPageLayout>
  );
}

/** The invoices section (history chart, strip, detail) while the card's invoices load. */
export function InvoicesLoading() {
  return <Skeleton role="status" aria-label="Loading invoices" className="h-64 rounded-xl" />;
}
