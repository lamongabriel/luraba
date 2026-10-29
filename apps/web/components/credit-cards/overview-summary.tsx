"use client";

import type { CreditCardOverview } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import { MoneyValue } from "@/components/finance/money-value";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { formatMonthKeyLabel, INVOICE_STATUS } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

/**
 * Totals for one currency: what is owed on the month's invoices, the limit still free, and when
 * each card's invoice is due (cards can be due on different days).
 */
export function OverviewSummary({
  overview,
  currencyCode,
  language,
  precision,
  showCurrency,
}: {
  overview: CreditCardOverview;
  currencyCode: string;
  language: string;
  precision: number;
  showCurrency: boolean;
}) {
  const totals = overview.totals.find((item) => item.currencyCode === currencyCode);
  const cards = overview.cards
    .filter((card) => card.currencyCode === currencyCode && card.invoice)
    .sort((left, right) =>
      (left.invoice?.dueDate ?? "").localeCompare(right.invoice?.dueDate ?? ""),
    );
  if (!totals) return null;

  const money = (amount: number, className?: string) => (
    <MoneyValue
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
      className={className}
    />
  );
  const monthLabel = formatMonthKeyLabel(overview.month, language);
  const remainingHint =
    totals.invoiceAmount === 0 ? (
      "Nothing due this month"
    ) : totals.invoiceRemainingAmount === 0 ? (
      "Fully paid"
    ) : (
      <>of {money(totals.invoiceAmount, "text-xs")} in purchases</>
    );

  return (
    <section className="rounded-xl border border-border/60 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Typography variant="small-muted">
            {monthLabel} invoices{showCurrency ? ` · ${currencyCode}` : ""}
          </Typography>
          <div className="mt-1 text-3xl">{money(totals.invoiceRemainingAmount)}</div>
          <Typography variant="small-muted" className="mt-1">
            {remainingHint}
          </Typography>
        </div>
        <div>
          <Typography variant="small-muted">Remaining limit</Typography>
          <div className="mt-1 text-3xl">
            {totals.limit.available === null ? "No limit" : money(totals.limit.available)}
          </div>
          <Typography variant="small-muted" className="mt-1">
            Includes future installments
          </Typography>
        </div>
      </div>

      {cards.length > 0 ? (
        <ul className="mt-5 divide-y divide-border/60 border-t border-border/60">
          {cards.map((card) => {
            const invoice = card.invoice;
            if (!invoice) return null;
            const status = INVOICE_STATUS[invoice.displayStatus];

            return (
              <li key={card.creditCardId}>
                <Link
                  href={`/credit-cards/${card.creditCardId}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-primary"
                >
                  <span className="min-w-0">
                    <Typography variant="small-strong" className="truncate">
                      {card.name} ··{card.last4}
                    </Typography>
                    <Typography variant="small-muted">
                      Due {formatShortDate(invoice.dueDate, language)}
                    </Typography>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <Badge className={cn("border-0", status.badge)}>{status.label}</Badge>
                    {money(invoice.remainingAmount, "text-sm")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
