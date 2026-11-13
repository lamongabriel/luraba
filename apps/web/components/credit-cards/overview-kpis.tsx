"use client";

import type { CreditCardInsights, CreditCardOverview } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { CombinedAmountDisplay, combinedNote } from "@/components/display";
import { KpiStrip } from "@/components/kpi";
import { formatMonthKeyLabel } from "@/lib/credit-card-invoices";

/**
 * The month's headline numbers (a slim strip on the page), each ONE number in the household base
 * currency across all cards (the per-currency amounts and the rates sit behind the figure): what the
 * invoices add up to (and how that compares with last month), what is still unpaid, the limit left and
 * the next due date. Each fact appears once; the per-card detail lives on the card tiles, in each
 * card's own currency.
 */
export function OverviewKpis({
  overview,
  insights,
  language,
}: {
  overview: CreditCardOverview;
  insights: CreditCardInsights | undefined;
  language: string;
}) {
  const { combined } = overview;
  const money = (amount: (typeof combined)["invoiceAmount"]) => (
    <CombinedAmountDisplay combined={amount} fx={combined.fx} language={language} size="md" />
  );
  const withNote = (amount: (typeof combined)["invoiceAmount"], text: React.ReactNode) => {
    const note = combinedNote(amount, combined.fx, language);
    return note ? (
      <>
        {note} · {text}
      </>
    ) : (
      text
    );
  };

  const monthLabel = formatMonthKeyLabel(overview.month, language);
  const nextDue = overview.cards
    .filter((card) => card.invoice && card.invoice.remainingAmount > 0)
    .sort((left, right) =>
      (left.invoice?.dueDate ?? "").localeCompare(right.invoice?.dueDate ?? ""),
    )[0];
  const previous = insights?.combined.previousTotal.total ?? null;
  const current = insights?.combined.total.total ?? null;
  const change =
    previous !== null && previous > 0 && current !== null
      ? Math.round(((current - previous) / previous) * 100)
      : null;
  const invoiceCount = overview.cards.filter((card) => card.invoice).length;
  const invoices = combined.invoiceAmount;
  const remaining = combined.invoiceRemainingAmount;
  const hasLimit = combined.limitAvailable.byCurrency.length > 0;

  return (
    <KpiStrip
      label="Invoice totals"
      items={[
        {
          label: `${monthLabel} invoices`,
          value: money(invoices),
          hint: withNote(
            invoices,
            change === null
              ? `${invoiceCount} ${invoiceCount === 1 ? "invoice" : "invoices"} due`
              : `${change > 0 ? "↑" : change < 0 ? "↓" : ""} ${Math.abs(change)}% vs last month`,
          ),
        },
        {
          label: "Still to pay",
          value: money(remaining),
          hint: withNote(
            remaining,
            invoices.total === 0
              ? "Nothing due"
              : remaining.total === 0
                ? "Fully paid"
                : "After payments made",
          ),
        },
        {
          label: "Available limit",
          value: hasLimit ? money(combined.limitAvailable) : "No limit set",
          hint: hasLimit ? (
            <>
              of{" "}
              <CombinedAmountDisplay
                combined={combined.limitTotal}
                fx={combined.fx}
                language={language}
                size="xs"
              />
              {combinedNote(combined.limitAvailable, combined.fx, language)
                ? ` · ${combinedNote(combined.limitAvailable, combined.fx, language)}`
                : null}
            </>
          ) : (
            "Your cards have no limits"
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
