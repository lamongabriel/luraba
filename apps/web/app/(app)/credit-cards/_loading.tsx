import { ChartCard, type ChartCardProps } from "@/components/charts";
import { CreditCardGridSkeleton } from "@/components/credit-cards/credit-card-grid";
import {
  INSIGHTS_GRID_CLASS,
  INVOICES_STRIP_HEIGHT,
} from "@/components/credit-cards/overview-insights";
import { OverviewInvoicesSkeleton } from "@/components/credit-cards/overview-invoices";
import { RecentPurchasesSkeleton } from "@/components/credit-cards/recent-purchases";
import { PageSection } from "@/components/finance/page-section";
import { KpiStripSkeleton } from "@/components/kpi";

const ZONES_CLASS = "grid min-w-0 gap-x-8 gap-y-10 lg:grid-cols-12 xl:gap-x-10";

function LoadingChart(props: Pick<ChartCardProps, "title">) {
  return (
    <ChartCard {...props} status="loading" flat heightClassName={INVOICES_STRIP_HEIGHT}>
      {null}
    </ChartCard>
  );
}

/**
 * Loading twin of the overview: the same strip and the same two zones (cards and charts on the
 * left, invoices and recent purchases on the right), built from the same sections and constants.
 */
export function CreditCardsLoading() {
  return (
    <div className="flex flex-col gap-10">
      <KpiStripSkeleton count={4} label="Loading invoice totals" />
      <div className={ZONES_CLASS}>
        <div className="min-w-0 lg:col-span-8">
          <CreditCardGridSkeleton />
        </div>
        <div className="min-w-0 lg:col-span-4">
          <OverviewInvoicesSkeleton />
        </div>
      </div>
      <div className={`${ZONES_CLASS} items-stretch`}>
        <div className="flex min-w-0 flex-col gap-10 lg:col-span-8">
          <div className={INSIGHTS_GRID_CLASS}>
            <PageSection
              divider
              title="Invoices and commitments"
              description="Six months of invoices, then installments already committed"
            >
              <LoadingChart title="Invoices and commitments" />
            </PageSection>
            <PageSection divider title="Spending by category" description="This month">
              <LoadingChart title="Spending by category" />
            </PageSection>
          </div>
        </div>
        <div className="min-w-0 lg:col-span-4">
          <RecentPurchasesSkeleton />
        </div>
      </div>
    </div>
  );
}
