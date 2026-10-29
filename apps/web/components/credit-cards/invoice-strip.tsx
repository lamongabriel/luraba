"use client";

import type { CreditCardCycle } from "@luraba/contracts";
import * as React from "react";
import { MoneyValue } from "@/components/finance/money-value";
import { formatMonthKeyLabel, INVOICE_STATUS, invoiceMonthKey } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

/** Horizontal month strip of every invoice, past to future, colored by status. */
export function InvoiceStrip({
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
  const selectedRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!selectedId) return;
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedId]);

  return (
    <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" aria-label="Invoices">
      {cycles.map((cycle) => {
        const status = INVOICE_STATUS[cycle.displayStatus];
        const selected = cycle.id === selectedId;

        return (
          <li key={cycle.id} className="shrink-0">
            <button
              type="button"
              ref={selected ? selectedRef : undefined}
              aria-pressed={selected}
              onClick={() => onSelect(cycle.id)}
              className={cn(
                "flex w-28 flex-col gap-0.5 rounded-xl border p-2.5 text-left transition-colors",
                status.surface,
                selected && "ring-2 ring-foreground/70",
              )}
            >
              <span className="text-xs font-medium">
                {formatMonthKeyLabel(invoiceMonthKey(cycle), language, "short")}
              </span>
              <MoneyValue
                amount={cycle.remainingAmount}
                currencyCode={currencyCode}
                language={language}
                precision={precision}
                className="text-sm"
              />
              <span className="text-[0.625rem] text-muted-foreground">{status.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
