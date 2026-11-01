"use client";

import type { CreditCardLimitBreakdown } from "@luraba/contracts";
import { AmountDisplay } from "@/components/display";
import { PageSection } from "@/components/finance/page-section";
import { Skeleton } from "@/components/ui/skeleton";
import { LIMIT_SEGMENTS } from "@/lib/credit-card-invoices";

/**
 * The credit limit (a plain section) as a segmented bar (closed invoice, open invoice, future installments,
 * available) with a legend, like a bank's limit screen.
 */
export function LimitBreakdown({
  breakdown,
  currencyCode,
  language,
  precision,
  title = "Credit limit",
}: {
  breakdown: CreditCardLimitBreakdown;
  currencyCode: string;
  language: string;
  precision: number;
  title?: string;
}) {
  const segments = LIMIT_SEGMENTS.map((segment) => ({
    ...segment,
    amount: breakdown[segment.key] ?? 0,
  })).filter((segment) => breakdown.limit !== null || segment.key !== "available");
  const total = Math.max(breakdown.limit ?? 0, breakdown.used);
  const money = (amount: number) => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
      showSign={false}
    />
  );

  return (
    <PageSection
      divider
      title={title}
      description={breakdown.limit === null ? "No limit set" : <>of {money(breakdown.limit)}</>}
    >
      <div
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${title}: ${segments.map((segment) => segment.label).join(", ")}`}
      >
        {segments
          .filter((segment) => segment.amount > 0 && total > 0)
          .map((segment) => (
            <div
              key={segment.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(segment.amount / total) * 100}%`, background: segment.color }}
            />
          ))}
      </div>

      <dl className="space-y-2">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: segment.color }}
                aria-hidden="true"
              />
              {segment.label}
            </dt>
            <dd>{money(segment.amount)}</dd>
          </div>
        ))}
      </dl>
    </PageSection>
  );
}

/** Loading twin of `LimitBreakdown`: the bar and four legend rows. */
export function LimitBreakdownSkeleton({ title = "Credit limit" }: { title?: string }) {
  return (
    <PageSection divider title={title}>
      <div role="status" aria-busy="true" aria-label="Loading credit limit" className="space-y-3">
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </PageSection>
  );
}
