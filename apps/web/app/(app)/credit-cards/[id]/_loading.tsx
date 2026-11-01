import { ChartCard } from "@/components/charts";
import { CreditCardDetailsPanelSkeleton } from "@/components/credit-cards/credit-card-details-panel";
import { INVOICE_COMPOSITION_HEIGHT } from "@/components/credit-cards/invoice-detail";
import { INVOICE_STRIP_HEIGHT } from "@/components/credit-cards/invoice-history-chart";
import { InvoiceListSkeleton } from "@/components/credit-cards/invoice-list";
import { LimitBreakdownSkeleton } from "@/components/credit-cards/limit-breakdown";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { PageSection } from "@/components/finance/page-section";
import { KpiStripSkeleton } from "@/components/kpi";
import { ScopedTransactionsTableSkeleton } from "@/components/tables/transactions/scoped-transactions-table";
import { Skeleton } from "@/components/ui/skeleton";

/** The invoices column (comparison strip, figures, expenses) while invoices load. */
export function InvoicesLoading() {
  return (
    <div className="space-y-6">
      <PageSection title="Invoice comparison" description="Click a bar to open that invoice">
        <ChartCard
          title="Invoice comparison"
          status="loading"
          flat
          heightClassName={INVOICE_STRIP_HEIGHT}
        >
          {null}
        </ChartCard>
      </PageSection>
      <div className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <KpiStripSkeleton count={4} label="Loading invoice figures" />
      </div>
      <div className="mt-2">
        <ScopedTransactionsTableSkeleton title="Invoice expenses" />
      </div>
    </div>
  );
}

/** Loading twin of the detail page: the same rail and invoices column. */
export function CreditCardDetailLoading() {
  return (
    <InternalPageLayout
      title="Credit card"
      subtitle="Invoices, limit and the purchases behind each one."
      back={{ href: "/credit-cards", label: "Credit cards" }}
    >
      <div className="grid min-w-0 items-stretch gap-8 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <Skeleton className="aspect-[1.586/1] w-full rounded-2xl" />
          <CreditCardDetailsPanelSkeleton />
          <LimitBreakdownSkeleton />
          <PageSection divider title="Invoice composition" description="Hover a slice for details">
            <ChartCard
              title="Invoice composition"
              status="loading"
              flat
              heightClassName={INVOICE_COMPOSITION_HEIGHT}
            >
              {null}
            </ChartCard>
          </PageSection>
          <PageSection divider title="All invoices" className="flex flex-1 flex-col">
            <div className="relative min-h-52 flex-1">
              <InvoiceListSkeleton />
            </div>
          </PageSection>
        </aside>
        <div className="min-w-0">
          <InvoicesLoading />
        </div>
      </div>
    </InternalPageLayout>
  );
}
