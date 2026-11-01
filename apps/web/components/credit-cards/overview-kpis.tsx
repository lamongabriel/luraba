"use client";

import type { CreditCardInsightsGroup, CreditCardOverview } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { AmountDisplay } from "@/components/display";
import { KpiStrip } from "@/components/kpi";
import { formatMonthKeyLabel } from "@/lib/credit-card-invoices";

/**
 * The month's headline numbers (a slim strip on the page) for one currency: what the invoices add up to (and how that compares
 * with last month), what is still unpaid, the limit left and the next due date. Each fact appears
 * once; the per-card detail lives on the card tiles.
 */
export function OverviewKpis({
  overview,
  currencyCode,
  insights,
  language,
  precision,
  showCurrency,
}: {
  overview: CreditCardOverview;
  currencyCode: string;
  insights: CreditCardInsightsGroup | undefined;
  language: string;
  precision: number;
  showCurrency: boolean;
}) {
  const totals = overview.totals.find((item) => item.currencyCode === currencyCode);
  if (!totals) return null;

  const suffix = showCurrency ? ` · ${currencyCode}` : "";
  const money = (amount: number) => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
      size="md"
      showSign={false}
    />
  );
  const monthLabel = formatMonthKeyLabel(overview.month, language);
  const unpaid = overview.cards
    .filter(
      (card) =>
        card.currencyCode === currencyCode && card.invoice && card.invoice.remainingAmount > 0,
    )
    .sort((left, right) =>
      (left.invoice?.dueDate ?? "").localeCompare(right.invoice?.dueDate ?? ""),
    );
  const nextDue = unpaid[0];
  const change =
    insights && insights.previousTotal > 0
      ? Math.round(((insights.total - insights.previousTotal) / insights.previousTotal) * 100)
      : null;
  const limit = totals.limit;
  const invoiceCount = overview.cards.filter(
    (card) => card.currencyCode === currencyCode && card.invoice,
  ).length;

  return (
    <KpiStrip
      label={`Invoice totals${suffix}`}
      items={[
        {
          label: `${monthLabel} invoices${suffix}`,
          value: money(totals.invoiceAmount),
          hint:
            change === null
              ? `${invoiceCount} ${invoiceCount === 1 ? "invoice" : "invoices"} due`
              : `${change > 0 ? "↑" : change < 0 ? "↓" : ""} ${Math.abs(change)}% vs last month`,
        },
        {
          label: `Still to pay${suffix}`,
          value: money(totals.invoiceRemainingAmount),
          hint:
            totals.invoiceAmount === 0
              ? "Nothing due"
              : totals.invoiceRemainingAmount === 0
                ? "Fully paid"
                : "After payments made",
        },
        {
          label: `Available limit${suffix}`,
          value: limit.available === null ? "No limit set" : money(limit.available),
          hint:
            limit.limit === null ? undefined : (
              <>
                of{" "}
                <AmountDisplay
                  amount={limit.limit}
                  currencyCode={currencyCode}
                  language={language}
                  precision={precision}
                  showSign={false}
                />
              </>
            ),
        },
        {
          label: "Next due date",
          value: nextDue?.invoice
            ? formatShortDate(nextDue.invoice.dueDate, language)
            : "All clear",
          hint: nextDue ? nextDue.name : "No unpaid invoices",
        },
      ]}
    />
  );
}
