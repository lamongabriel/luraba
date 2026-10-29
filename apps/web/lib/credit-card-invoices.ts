import type {
  CreditCardCycle,
  CreditCardCycleDetails,
  CreditCardCycleDisplayStatus,
  TransactionFeedRow,
} from "@luraba/contracts";
import {
  formatDisplayDate,
  formatMonthKey,
  getTodayInTimezone,
  shiftMonthKey,
} from "@luraba/domain";

/**
 * How an invoice is shown. `due` is a closed invoice waiting for payment, `overdue` is the same
 * invoice after its due date, `current` is the invoice new purchases land in today.
 */
export const INVOICE_STATUS: Record<
  CreditCardCycleDisplayStatus,
  { label: string; description: string; bar: string; badge: string; surface: string }
> = {
  paid: {
    label: "Paid",
    description: "Paid in full",
    bar: "var(--color-invoice-paid)",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    surface: "border-emerald-500/40 bg-emerald-500/10",
  },
  due: {
    label: "Closed",
    description: "Closed and waiting for payment",
    bar: "var(--color-invoice-closed)",
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    surface: "border-orange-500/40 bg-orange-500/10",
  },
  overdue: {
    label: "Overdue",
    description: "Closed and past its due date",
    bar: "var(--color-invoice-overdue)",
    badge: "bg-red-500/15 text-red-700 dark:text-red-300",
    surface: "border-red-500/40 bg-red-500/10",
  },
  current: {
    label: "Open",
    description: "New purchases are landing here",
    bar: "var(--color-invoice-open)",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    surface: "border-sky-500/40 bg-sky-500/10",
  },
  upcoming: {
    label: "Upcoming",
    description: "Installments committed to a future invoice",
    bar: "var(--color-invoice-upcoming)",
    badge: "bg-muted text-muted-foreground",
    surface: "border-border bg-muted/40",
  },
};

/** Limit breakdown segments, in the order they fill the bar. */
export const LIMIT_SEGMENTS = [
  { key: "closedInvoice", label: "Closed invoice", color: "var(--color-invoice-closed)" },
  { key: "openInvoice", label: "Open invoice", color: "var(--color-invoice-open)" },
  { key: "futureInvoices", label: "Future invoices", color: "var(--color-invoice-upcoming)" },
  { key: "available", label: "Available", color: "var(--color-invoice-paid)" },
] as const;

/** The invoice is named after the month it is due in (`YYYY-MM`). */
export function invoiceMonthKey(cycle: Pick<CreditCardCycle, "dueDate">): string {
  return cycle.dueDate.slice(0, 7);
}

export function currentMonthKey(timezone: string): string {
  return formatMonthKey(getTodayInTimezone(timezone));
}

export { shiftMonthKey };

export function formatMonthKeyLabel(
  monthKey: string,
  language = "en",
  style: "long" | "short" = "long",
): string {
  return formatDisplayDate(`${monthKey}-01`, {
    language,
    formatString: style === "long" ? "MMMM yyyy" : "MMM yy",
  });
}

export type InvoiceChange = { direction: "up" | "down" | "same"; percent: number | null };

/** How an invoice compares with the one before it; `percent` is null when there is no base. */
export function compareInvoices(current: number, previous: number | null): InvoiceChange | null {
  if (previous === null) return null;
  if (current === previous) return { direction: "same", percent: 0 };
  const percent = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
  return { direction: current > previous ? "up" : "down", percent };
}

export type InvoiceLine =
  | {
      kind: "purchase";
      key: string;
      date: string;
      description: string;
      amount: number;
      installmentLabel: string | null;
      transactionId: string;
      purchaseId: string;
      installmentId: string;
      installmentNumber: number;
      installmentCount: number;
      categoryId: string | null;
      merchantId: string | null;
      postedDate: string;
    }
  | {
      kind: "payment";
      key: string;
      date: string;
      description: string;
      amount: number;
      paymentId: string;
    };

export type InvoiceLineGroup = { date: string; lines: InvoiceLine[] };

/** Purchases and the payments applied to an invoice, grouped by day, newest day first. */
export function buildInvoiceLines(
  details: Pick<CreditCardCycleDetails, "items" | "payments">,
): InvoiceLineGroup[] {
  const lines: InvoiceLine[] = [
    ...details.items.map((item) => ({
      kind: "purchase" as const,
      key: item.installmentId,
      date: item.purchaseDate,
      description: item.description,
      amount: item.amount,
      installmentLabel:
        item.installmentCount > 1 ? `${item.installmentNumber}/${item.installmentCount}` : null,
      transactionId: item.transactionId,
      purchaseId: item.purchaseId,
      installmentId: item.installmentId,
      installmentNumber: item.installmentNumber,
      installmentCount: item.installmentCount,
      categoryId: item.categoryId,
      merchantId: item.merchantId,
      postedDate: item.postedDate,
    })),
    ...details.payments.map((payment) => ({
      kind: "payment" as const,
      key: `${payment.paymentId}-${payment.amount}`,
      date: payment.paymentDate,
      description: payment.description,
      amount: payment.amount,
      paymentId: payment.paymentId,
    })),
  ];

  const groups = new Map<string, InvoiceLine[]>();
  for (const line of lines) {
    groups.set(line.date, [...(groups.get(line.date) ?? []), line]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => (left < right ? 1 : left > right ? -1 : 0))
    .map(([date, groupLines]) => ({ date, lines: groupLines }));
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Plain CSV of an invoice: purchases positive, payments negative, amounts in major units. */
export function buildInvoiceCsv(
  details: Pick<CreditCardCycleDetails, "items" | "payments">,
  precision = 2,
): string {
  const divisor = 10 ** precision;
  const rows = buildInvoiceLines(details)
    .flatMap((group) => group.lines)
    .sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0))
    .map((line) => {
      const amount = (line.kind === "payment" ? -line.amount : line.amount) / divisor;
      const installment = line.kind === "purchase" ? (line.installmentLabel ?? "") : "";
      return [
        line.date,
        csvCell(line.description),
        line.kind === "payment" ? "Payment" : "Purchase",
        installment,
        amount.toFixed(precision),
      ].join(",");
    });

  return ["Date,Description,Type,Installment,Amount", ...rows].join("\n");
}

/**
 * The transactions feed row for an invoice line, so the regular transaction sheet can open it.
 * The sheet loads the purchase or payment itself; this only carries what the header needs.
 */
export function invoiceLineToFeedRow(
  line: InvoiceLine,
  card: { id: string; currencyCode: string },
): TransactionFeedRow {
  const base = {
    description: line.description,
    amount: line.amount,
    currencyCode: card.currencyCode,
    toAmount: null,
    toCurrencyCode: null,
    accountId: null,
    accountName: null,
    accountClassification: null,
    toAccountId: null,
    toAccountName: null,
    toAccountClassification: null,
    paymentMethodId: null,
    paymentMethodCode: null,
    paymentMethodName: null,
    paymentMethodScope: null,
    paymentMethodTranslationKey: null,
    tags: [],
    includeInBudget: true,
    purchaseDate: line.date,
    createdAt: line.date,
    updatedAt: line.date,
    creditCardId: card.id,
  };

  if (line.kind === "payment") {
    return {
      ...base,
      id: line.paymentId,
      type: "transfer",
      categoryId: null,
      merchantId: null,
      postedDate: line.date,
      rowId: line.paymentId,
      rowKind: "credit_card_payment",
      originType: "credit_card_payment",
      purchaseId: null,
      paymentId: line.paymentId,
      installmentId: null,
      installmentNumber: null,
      installmentCount: null,
    };
  }

  return {
    ...base,
    id: line.transactionId,
    type: "expense",
    categoryId: line.categoryId,
    merchantId: line.merchantId,
    postedDate: line.postedDate,
    rowId: line.installmentId,
    rowKind: "credit_card_installment",
    originType: "credit_card_installment",
    purchaseId: line.purchaseId,
    paymentId: null,
    installmentId: line.installmentId,
    installmentNumber: line.installmentNumber,
    installmentCount: line.installmentCount,
  };
}
