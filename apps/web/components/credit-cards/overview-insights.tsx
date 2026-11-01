"use client";

import type { CreditCardInsightsGroup } from "@luraba/contracts";
import * as React from "react";
import { BarChartCard, type ChartStatus, DonutChartCard } from "@/components/charts";
import { PageSection } from "@/components/finance/page-section";
import { formatMonthKeyLabel } from "@/lib/credit-card-invoices";

/** Plot height of the invoices strip; the loading twin uses the same one. */
/** Five `RecentPurchases` rows (h-14 plus their hairlines), so both zones end on the same line. */
export const INVOICES_STRIP_HEIGHT = "h-[17.75rem]";

/** Width of the donut column beside the invoices chart; the loading twin uses the same grid. */
export const INSIGHTS_GRID_CLASS =
  "grid min-w-0 gap-x-8 gap-y-10 md:grid-cols-[minmax(0,1fr)_14rem]";

/**
 * Two plain sections side by side for one currency: six months of invoices plus the installments already
 * committed ahead (a slim bar chart), then the month's spending by category (a compact donut,
 * names and shares on hover). No cards; each section brings its own loading, error and empty state.
 */
export function OverviewInsights({
  group,
  currencyCode,
  month,
  status,
  errorMessage,
  onRetry,
  language,
  precision,
}: {
  group: CreditCardInsightsGroup | undefined;
  currencyCode: string;
  month: string;
  status: ChartStatus;
  errorMessage?: string;
  onRetry: () => void;
  language: string;
  precision: number;
}) {
  const state = { status, errorMessage, onRetry, flat: true };
  const slices = React.useMemo(
    () =>
      (group?.byCategory ?? []).map((category) => ({
        id: category.categoryId,
        name: category.name,
        value: category.amount,
        color: category.color,
      })),
    [group],
  );
  const timeline = React.useMemo(() => {
    const points = [
      ...(group?.history ?? []).map((point) => ({
        date: `${point.month}-01`,
        invoiced: point.amount,
        committed: 0,
      })),
      ...(group?.upcomingInstallments ?? []).map((point) => ({
        date: `${point.month}-01`,
        invoiced: 0,
        committed: point.amount,
      })),
    ];
    // All zeros is "nothing to chart", so the section shows its empty state.
    return points.some((point) => point.invoiced > 0 || point.committed > 0) ? points : [];
  }, [group]);

  return (
    <div className={INSIGHTS_GRID_CLASS}>
      <PageSection
        divider
        title="Invoices and commitments"
        description="Six months of invoices, then installments already committed"
      >
        <BarChartCard
          title="Invoices and commitments"
          data={timeline}
          series={[
            { key: "invoiced", label: "Invoiced" },
            {
              key: "committed",
              label: "Committed installments",
              color: "var(--color-invoice-upcoming)",
            },
          ]}
          stacked
          bucket="month"
          currencyCode={currencyCode}
          precision={precision}
          language={language}
          heightClassName={INVOICES_STRIP_HEIGHT}
          emptyTitle="No invoices yet"
          emptyDescription="Invoice totals appear once the cards have purchases."
          {...state}
        />
      </PageSection>
      <PageSection
        divider
        title="Spending by category"
        description={formatMonthKeyLabel(month, language)}
      >
        <DonutChartCard
          title="Spending by category"
          legend="hover"
          heightClassName={INVOICES_STRIP_HEIGHT}
          data={slices}
          currencyCode={currencyCode}
          precision={precision}
          language={language}
          emptyTitle="No spending this month"
          emptyDescription="Purchases on this month's invoices are broken down by category here."
          {...state}
        />
      </PageSection>
    </div>
  );
}
