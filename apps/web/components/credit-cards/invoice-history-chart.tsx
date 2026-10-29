"use client";

import type { CreditCardCycle } from "@luraba/contracts";
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Typography } from "@/components/ui/typography";
import {
  compareInvoices,
  formatMonthKeyLabel,
  INVOICE_STATUS,
  invoiceMonthKey,
} from "@/lib/credit-card-invoices";
import { formatCurrency } from "@/lib/finance";

/** Invoice totals side by side: click a bar to open that invoice; color is the invoice status. */
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
  const data = cycles.map((cycle, index) => ({
    id: cycle.id,
    label: formatMonthKeyLabel(invoiceMonthKey(cycle), language, "short"),
    amount: cycle.statementAmount,
    status: cycle.displayStatus,
    change: compareInvoices(
      cycle.statementAmount,
      index > 0 ? (cycles[index - 1]?.statementAmount ?? null) : null,
    ),
  }));
  const money = (amount: number) =>
    formatCurrency(amount, currencyCode, language, undefined, precision);

  return (
    <ChartContainer
      config={{ amount: { label: "Invoice", color: "var(--color-invoice-open)" } }}
      className="h-48 w-full"
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <ChartTooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
            if (!active || !point) return null;
            const change = point.change;

            return (
              <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                <Typography variant="small-strong">
                  {point.label} · {INVOICE_STATUS[point.status].label}
                </Typography>
                <div className="tabular-nums">{money(point.amount)} in purchases</div>
                {change ? (
                  <Typography variant="small-muted">
                    {change.direction === "same"
                      ? "Same as the previous invoice"
                      : `${change.percent === null ? "" : `${Math.abs(change.percent)}% `}${change.direction === "up" ? "more" : "less"} than the previous invoice`}
                  </Typography>
                ) : null}
              </div>
            );
          }}
        />
        <Bar
          dataKey="amount"
          radius={[5, 5, 0, 0]}
          className="cursor-pointer"
          onClick={(entry) => {
            const id = (entry as unknown as { id?: string }).id;
            if (id) onSelect(id);
          }}
        >
          {data.map((point) => (
            <Cell
              key={point.id}
              fill={INVOICE_STATUS[point.status].bar}
              fillOpacity={point.id === selectedId ? 1 : 0.55}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
