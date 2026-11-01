"use client";

import type { CreditCardOverviewCard } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import { AmountDisplay, CreditCardDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { PageSection } from "@/components/finance/page-section";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { INVOICE_STATUS } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

const ROW_CLASS = "flex h-14 items-center justify-between gap-3";

/**
 * The month's invoice of every card, soonest due first: card, amount still to pay, due date and
 * status. Each row opens the card. This is where invoices are said; the card tiles show the limit.
 */
export function OverviewInvoices({
  cards,
  language,
  precisionOf,
  monthLabel,
}: {
  cards: CreditCardOverviewCard[];
  language: string;
  precisionOf: (currencyCode: string) => number;
  monthLabel: string;
}) {
  const rows = cards
    .filter((card) => card.invoice)
    .sort((left, right) =>
      (left.invoice?.dueDate ?? "").localeCompare(right.invoice?.dueDate ?? ""),
    );

  return (
    <PageSection title="Invoices due" description={monthLabel}>
      {rows.length === 0 ? (
        <EmptyState
          variant="embedded"
          title="No invoices this month"
          description="Cards with purchases on this month's cycle show their invoice here."
        />
      ) : (
        <ul className="divide-y divide-border/60" aria-label="Invoices due">
          {rows.map((card) => {
            const invoice = card.invoice;
            if (!invoice) return null;
            const status = INVOICE_STATUS[invoice.displayStatus];
            return (
              <li key={card.creditCardId}>
                <Link
                  href={`/credit-cards/${card.creditCardId}`}
                  className={cn(ROW_CLASS, "rounded-md transition-colors hover:bg-muted/40")}
                >
                  <CreditCardDisplay card={card} size="sm" className="flex-1" />
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <AmountDisplay
                      amount={invoice.remainingAmount}
                      currencyCode={card.currencyCode}
                      language={language}
                      precision={precisionOf(card.currencyCode)}
                      showSign={false}
                    />
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      Due {formatShortDate(invoice.dueDate, language)}
                      <Badge className={cn("h-4 border-0 px-1.5 text-[0.65rem]", status.badge)}>
                        {status.label}
                      </Badge>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}

/** Loading twin of `OverviewInvoices`: rows of the same height. */
export function OverviewInvoicesSkeleton() {
  return (
    <PageSection title="Invoices due" description={<Skeleton className="inline-block h-3 w-20" />}>
      <div role="status" aria-busy="true" aria-label="Loading invoices" className="space-y-px">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-14 w-full" />
        ))}
      </div>
    </PageSection>
  );
}
