"use client";

import type { CreditCardCycle } from "@luraba/contracts";
import { AmountDisplay } from "@/components/display";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMonthKeyLabel, INVOICE_STATUS, invoiceMonthKey } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

const ROW_CLASS = "flex h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-sm";

/**
 * Every invoice of the card, newest first, in a list that fills whatever height the rail has left
 * and scrolls inside it. Picking one opens it on the page (the same as clicking its bar).
 */
export function InvoiceList({
  cycles,
  selectedId,
  onSelect,
  currencyCode,
  language,
  precision,
}: {
  cycles: CreditCardCycle[];
  selectedId: string | undefined;
  onSelect: (cycleId: string) => void;
  currencyCode: string;
  language: string;
  precision: number;
}) {
  const ordered = [...cycles].reverse();

  return (
    <ScrollArea className="absolute inset-0">
      <ul aria-label="All invoices" className="space-y-0.5 pr-2">
        {ordered.map((cycle) => {
          const status = INVOICE_STATUS[cycle.displayStatus];
          const active = cycle.id === selectedId;
          return (
            <li key={cycle.id}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(cycle.id)}
                className={cn(
                  ROW_CLASS,
                  "text-left transition-colors hover:bg-muted/60",
                  active && "bg-muted",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: status.bar }}
                    role="img"
                    aria-label={status.label}
                  />
                  <span className="truncate font-medium">
                    {formatMonthKeyLabel(invoiceMonthKey(cycle), language)}
                  </span>
                </span>
                <AmountDisplay
                  amount={cycle.statementAmount}
                  currencyCode={currencyCode}
                  language={language}
                  precision={precision}
                  showSign={false}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}

/** Loading twin of `InvoiceList`: rows of the same height. */
export function InvoiceListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading invoices"
      className="absolute inset-0 space-y-0.5 overflow-hidden"
    >
      {Array.from({ length: 6 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
}
