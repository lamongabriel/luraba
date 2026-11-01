"use client";

import type { CreditCardCycle } from "@luraba/contracts";
import * as React from "react";
import { BarChartCard } from "@/components/charts";
import { PageSection } from "@/components/finance/page-section";
import { INVOICE_STATUS, invoiceMonthKey } from "@/lib/credit-card-invoices";

/**
 * A slim strip of invoice totals side by side, past to future, colored by status (green paid, orange closed, red
 * overdue, blue open, gray upcoming). Click a bar to open that invoice; the others are dimmed.
 */
/** Plot height of the strip; the loading twin uses the same one. */
export const INVOICE_STRIP_HEIGHT = "h-28";

export function InvoiceHistoryChart({
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
  const data = React.useMemo(
    () =>
      cycles.map((cycle) => ({
        id: cycle.id,
        date: `${invoiceMonthKey(cycle)}-01`,
        invoice: cycle.statementAmount,
        status: cycle.displayStatus,
      })),
    [cycles],
  );

  return (
    <PageSection title="Invoice comparison" description="Click a bar to open that invoice">
      <BarChartCard
        title="Invoice comparison"
        flat
        heightClassName={INVOICE_STRIP_HEIGHT}
        data={data}
        series={[{ key: "invoice", label: "Purchases" }]}
        bucket="month"
        currencyCode={currencyCode}
        precision={precision}
        language={language}
        getBarColor={(row) => INVOICE_STATUS[row.status as keyof typeof INVOICE_STATUS].bar}
        isRowActive={(row) => row.id === selectedId}
        onBarClick={(row) => onSelect(String(row.id))}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices appear once the card has purchases."
      />
    </PageSection>
  );
}
