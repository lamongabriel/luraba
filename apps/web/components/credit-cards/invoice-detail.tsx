"use client";

import { ArrowDown01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCardCycle, CreditCardCycleDetails } from "@luraba/contracts";
import { formatDisplayDate, formatShortDate } from "@luraba/domain";
import * as React from "react";
import { ErrorState } from "@/components/error-state";
import { MoneyValue } from "@/components/finance/money-value";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import {
  buildInvoiceCsv,
  buildInvoiceLines,
  compareInvoices,
  formatMonthKeyLabel,
  INVOICE_STATUS,
  type InvoiceLine,
  invoiceMonthKey,
} from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** One invoice: status, totals, a summary, and the purchases and payments that make it up. */
export function InvoiceDetail({
  cycle,
  previousAmount,
  details,
  isLoading,
  error,
  onRetry,
  currencyCode,
  language,
  precision,
  cardName,
  onSelectLine,
  onPay,
}: {
  cycle: CreditCardCycle;
  /** The previous invoice's total, to say whether spending went up or down. */
  previousAmount: number | null;
  details: CreditCardCycleDetails | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  currencyCode: string;
  language: string;
  precision: number;
  cardName: string;
  onSelectLine: (line: InvoiceLine) => void;
  onPay: () => void;
}) {
  const status = INVOICE_STATUS[cycle.displayStatus];
  const monthKey = invoiceMonthKey(cycle);
  const change = compareInvoices(cycle.statementAmount, previousAmount);
  const groups = React.useMemo(() => (details ? buildInvoiceLines(details) : []), [details]);
  const money = (amount: number, className?: string) => (
    <MoneyValue
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
      className={className}
    />
  );
  const canPay = cycle.remainingAmount > 0 && cycle.displayStatus !== "upcoming";

  let lines: React.ReactNode;
  if (isLoading) {
    lines = (
      <div className="space-y-2">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-12 rounded-lg bg-muted/50" />
        ))}
      </div>
    );
  } else if (error) {
    lines = (
      <ErrorState
        title="Couldn't load this invoice"
        description={error.message}
        onRetry={onRetry}
      />
    );
  } else if (groups.length === 0) {
    lines = <Typography variant="body-muted">No purchases on this invoice yet.</Typography>;
  } else {
    lines = (
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.date}>
            <Typography variant="small-muted" className="border-b border-border/60 pb-1">
              {formatDisplayDate(group.date, { language, formatString: "EEEE, MMM d" })}
            </Typography>
            <ul className="divide-y divide-border/40">
              {group.lines.map((line) => (
                <li key={line.key}>
                  <button
                    type="button"
                    onClick={() => onSelectLine(line)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:text-primary"
                  >
                    <span className="min-w-0">
                      <Typography variant="small-strong" className="truncate">
                        {line.description}
                      </Typography>
                      <Typography variant="small-muted">
                        {line.kind === "payment"
                          ? "Payment"
                          : line.installmentLabel
                            ? `Installment ${line.installmentLabel}`
                            : "One-time purchase"}
                      </Typography>
                    </span>
                    {money(
                      line.kind === "payment" ? -line.amount : line.amount,
                      cn(
                        "text-sm",
                        line.kind === "payment" && "text-emerald-600 dark:text-emerald-400",
                      ),
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  const purchasesTotal = details?.items.reduce((total, item) => total + item.amount, 0) ?? 0;
  const installmentCount = details?.items.filter((item) => item.installmentCount > 1).length ?? 0;

  return (
    <div className="space-y-4">
      <section className={cn("rounded-xl border p-4", status.surface)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Typography variant="small-strong">
                {formatMonthKeyLabel(monthKey, language)} invoice
              </Typography>
              <Badge className={cn("border-0", status.badge)}>{status.label}</Badge>
            </div>
            <div className="mt-1 text-3xl">{money(cycle.remainingAmount)}</div>
            <Typography variant="small-muted" className="mt-1">
              Purchases {money(cycle.statementAmount, "text-xs")} · Paid{" "}
              {money(cycle.paidAmount, "text-xs")}
            </Typography>
            {change ? (
              <Typography variant="small-muted" className="mt-1">
                {change.direction === "same"
                  ? "Purchases same as the previous invoice"
                  : `Purchases ${change.percent === null ? "" : `${Math.abs(change.percent)}% `}${change.direction === "up" ? "more" : "less"} than the previous invoice`}
              </Typography>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canPay ? (
              <PermissionButton
                permission={PERMISSIONS.TRANSACTIONS_CREATE}
                deniedMessage="Your household role cannot record payments."
                onClick={onPay}
              >
                Pay invoice
              </PermissionButton>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={!details}
              onClick={() =>
                details &&
                downloadCsv(
                  `${cardName}-invoice-${monthKey}.csv`.replaceAll(" ", "-"),
                  buildInvoiceCsv(details, precision),
                )
              }
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
              Export invoice
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Due date</dt>
            <dd className="font-medium">{formatShortDate(cycle.dueDate, language)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Closing date</dt>
            <dd className="font-medium">{formatShortDate(cycle.closingDate, language)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Invoice total</dt>
            <dd>{money(cycle.statementAmount)}</dd>
          </div>
        </dl>
      </section>

      <details className="group rounded-xl border border-border/60 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          Invoice summary
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Purchases and installments</dt>
            <dd>{money(purchasesTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Of which installments</dt>
            <dd>{installmentCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Payments applied</dt>
            <dd>{money(cycle.paidAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Purchases from</dt>
            <dd>
              {formatShortDate(cycle.periodStart, language)} to{" "}
              {formatShortDate(cycle.periodEnd, language)}
            </dd>
          </div>
        </dl>
      </details>

      <section>
        <Typography variant="subheading" className="mb-2">
          Invoice expenses
        </Typography>
        {lines}
      </section>
    </div>
  );
}
