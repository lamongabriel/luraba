"use client";

import type { CreditCardLimitBreakdown } from "@luraba/contracts";
import { MoneyValue } from "@/components/finance/money-value";
import { Typography } from "@/components/ui/typography";
import { LIMIT_SEGMENTS } from "@/lib/credit-card-invoices";

/**
 * The credit limit as a segmented bar (closed invoice, open invoice, future installments,
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
    <MoneyValue
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
    />
  );

  return (
    <section className="rounded-xl border border-border/60 p-4" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <Typography variant="small-strong">{title}</Typography>
        <Typography variant="small-muted">
          {breakdown.limit === null ? "No limit set" : <>of {money(breakdown.limit)}</>}
        </Typography>
      </div>

      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted"
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

      <dl className="mt-4 space-y-2">
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
    </section>
  );
}
