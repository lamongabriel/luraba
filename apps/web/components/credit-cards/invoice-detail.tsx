"use client";

import { Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  Category,
  CreditCardCycle,
  CreditCardCycleDetails,
  CreditCardCyclePayment,
} from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import * as React from "react";
import { DonutChartCard } from "@/components/charts";
import { AmountDisplay } from "@/components/display";
import { PageSection } from "@/components/finance/page-section";
import { KpiStrip } from "@/components/kpi";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  buildInvoiceCsv,
  compareInvoices,
  formatMonthKeyLabel,
  INVOICE_STATUS,
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

interface InvoiceMoney {
  currencyCode: string;
  language: string;
  precision: number;
}

/**
 * The selected invoice at the top of the detail page: its name and status, the Pay and Export
 * actions, and the four facts (total, still to pay, due date, closing date) as a neutral strip of
 * figures. Everything about the invoice is said here once.
 */
export function InvoiceSummary({
  cycle,
  previousAmount,
  details,
  cardName,
  onPay,
  currencyCode,
  language,
  precision,
}: {
  cycle: CreditCardCycle;
  /** The previous invoice's total, to say whether spending went up or down. */
  previousAmount: number | null;
  details: CreditCardCycleDetails | undefined;
  cardName: string;
  onPay: () => void;
} & InvoiceMoney) {
  const status = INVOICE_STATUS[cycle.displayStatus];
  const monthKey = invoiceMonthKey(cycle);
  const change = compareInvoices(cycle.statementAmount, previousAmount);
  const canPay = cycle.remainingAmount > 0 && cycle.displayStatus !== "upcoming";
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Typography variant="subheading">
            {formatMonthKeyLabel(monthKey, language)} invoice
          </Typography>
          <Badge className={cn("border-0", status.badge)}>{status.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
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
          {canPay ? (
            <PermissionButton
              permission={PERMISSIONS.TRANSACTIONS_CREATE}
              deniedMessage="Your household role cannot record payments."
              onClick={onPay}
            >
              Pay invoice
            </PermissionButton>
          ) : null}
        </div>
      </div>
      <KpiStrip
        label="Invoice figures"
        items={[
          {
            label: "Invoice total",
            value: money(cycle.statementAmount),
            hint:
              change && change.percent !== null && change.percent !== 0
                ? `${change.direction === "up" ? "↑" : "↓"} ${Math.abs(change.percent)}% vs previous`
                : `${formatShortDate(cycle.periodStart, language)} to ${formatShortDate(cycle.periodEnd, language)}`,
          },
          {
            label: "Still to pay",
            value: money(cycle.remainingAmount),
            hint:
              cycle.paidAmount > 0 ? (
                <>
                  <AmountDisplay
                    amount={cycle.paidAmount}
                    currencyCode={currencyCode}
                    language={language}
                    precision={precision}
                    showSign={false}
                  />{" "}
                  paid
                </>
              ) : (
                status.description
              ),
          },
          {
            label: "Due date",
            value: formatShortDate(cycle.dueDate, language),
            hint: status.description,
          },
          {
            label: "Closing date",
            value: formatShortDate(cycle.closingDate, language),
            hint: "Later purchases go to the next invoice",
          },
        ]}
      />
    </div>
  );
}

/** Plot height of the composition ring; its loading twin uses the same one. */
export const INVOICE_COMPOSITION_HEIGHT = "h-48";

/**
 * What the invoice is made of, by category (uncategorized purchases grouped together): a small
 * ring for the left rail with no permanent legend; name, amount and share show on hover or focus.
 */
export function InvoiceComposition({
  details,
  isLoading,
  error,
  onRetry,
  categories,
  currencyCode,
  language,
  precision,
}: {
  details: CreditCardCycleDetails | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  categories: Category[] | undefined;
  currencyCode: string;
  language: string;
  precision: number;
}) {
  const slices = React.useMemo(() => {
    const totals = new Map<string | null, number>();
    for (const item of details?.items ?? []) {
      totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amount);
    }
    const used = new Set<string>();
    return (
      [...totals.entries()]
        .map(([categoryId, value]) => {
          const category = categories?.find((item) => item.id === categoryId);
          return {
            id: categoryId,
            name: categoryId ? (category?.name ?? "Category") : "Uncategorized",
            value,
            color: category?.color ?? null,
          };
        })
        .sort((left, right) => right.value - left.value)
        // Repeated category colors would merge slices: the repeats take the chart palette instead.
        .map((slice) => {
          if (slice.color && !used.has(slice.color)) {
            used.add(slice.color);
            return slice;
          }
          return { ...slice, color: null };
        })
    );
  }, [details, categories]);

  return (
    <PageSection divider title="Invoice composition" description="Hover a slice for details">
      <DonutChartCard
        flat
        legend="hover"
        title="Invoice composition"
        heightClassName={INVOICE_COMPOSITION_HEIGHT}
        centerLabel="Invoice"
        status={isLoading ? "loading" : error ? "error" : "ready"}
        errorMessage={error?.message}
        onRetry={onRetry}
        data={slices}
        currencyCode={currencyCode}
        precision={precision}
        language={language}
        emptyTitle="No purchases yet"
        emptyDescription="This invoice has no purchases to break down."
      />
    </PageSection>
  );
}

/** Payments applied to the invoice. Shown only when there are some. */
export function InvoicePayments({
  payments,
  currencyCode,
  language,
  precision,
}: { payments: CreditCardCyclePayment[] } & InvoiceMoney) {
  return (
    <PageSection className="mt-2" title="Payments" description="Applied to this invoice">
      <ul className="divide-y divide-border/60">
        {payments.map((payment) => (
          <li
            key={payment.paymentId}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{payment.description}</span>
              <span className="block text-xs text-muted-foreground">
                {formatShortDate(payment.paymentDate, language)}
              </span>
            </span>
            <AmountDisplay
              amount={payment.amount}
              currencyCode={currencyCode}
              kind="income"
              language={language}
              precision={precision}
            />
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
