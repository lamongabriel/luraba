"use client";

import type { CreditCardOverviewCard } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import { CreditCardPreview } from "@/components/credit-cards/credit-card-preview";
import { MoneyValue } from "@/components/finance/money-value";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { INVOICE_STATUS } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

/** Every card of the household in a horizontally scrollable row; a card opens its detail page. */
export function CreditCardCarousel({
  cards,
  language,
  precisionOf,
}: {
  cards: CreditCardOverviewCard[];
  language: string;
  precisionOf: (currencyCode: string) => number;
}) {
  return (
    <ul
      className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3"
      aria-label="Credit cards"
    >
      {cards.map((card) => {
        const status = card.invoice ? INVOICE_STATUS[card.invoice.displayStatus] : null;

        return (
          <li key={card.creditCardId} className="w-72 shrink-0 snap-start">
            <Link
              href={`/credit-cards/${card.creditCardId}`}
              aria-label={`Open ${card.name}`}
              className="block rounded-2xl transition-transform hover:-translate-y-0.5"
            >
              <CreditCardPreview
                brand={card.brand}
                color={card.color ?? undefined}
                institutionName={card.institutionName ?? undefined}
                last4={card.last4}
                name={card.name}
              />
            </Link>
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <Typography variant="small-strong" className="truncate">
                  {card.name} ··{card.last4}
                </Typography>
                <Typography variant="small-muted">
                  {card.invoice
                    ? `Due ${formatShortDate(card.invoice.dueDate, language)}`
                    : `Closes day ${card.closingDay}, due day ${card.dueDay}`}
                </Typography>
              </div>
              {card.invoice && status ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <MoneyValue
                    amount={card.invoice.remainingAmount}
                    currencyCode={card.currencyCode}
                    language={language}
                    precision={precisionOf(card.currencyCode)}
                    className="text-sm"
                  />
                  <Badge className={cn("border-0", status.badge)}>{status.label}</Badge>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
