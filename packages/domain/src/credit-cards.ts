/** Where an invoice sits relative to today, for the limit it is consuming. */
export type CycleLimitBucket = "closed" | "open" | "future";

/** The slice of a billing cycle the limit maths needs. Dates are ISO `YYYY-MM-DD` strings. */
export type LimitCycle = {
  periodStart: string;
  closingDate: string;
  /** Minor units still owed on the invoice. */
  remainingAmount: number;
};

export type LimitBreakdown = {
  /** Credit limit in minor units, or `null` when the card has no limit. */
  limit: number | null;
  /** Unpaid invoices that already closed. */
  closedInvoice: number;
  /** Unpaid part of the invoice new purchases are landing in today. */
  openInvoice: number;
  /** Installments committed to invoices that have not started yet. */
  futureInvoices: number;
  /** closedInvoice + openInvoice + futureInvoices. */
  used: number;
  /** Limit left to spend (never negative), `null` without a limit. */
  available: number | null;
};

/**
 * ISO dates compare correctly as strings. A cycle is closed once its closing date has passed,
 * future before its period starts, and open in between (closing day included, like the API).
 */
export function classifyCycleForLimit(
  cycle: Pick<LimitCycle, "periodStart" | "closingDate">,
  today: string,
): CycleLimitBucket {
  if (cycle.closingDate < today) return "closed";
  if (cycle.periodStart > today) return "future";
  return "open";
}

/** A negative limit means the card has none (same convention as `credit_cards.credit_limit_amount`). */
export function buildLimitBreakdown(
  creditLimitAmount: number,
  cycles: readonly LimitCycle[],
  today: string,
): LimitBreakdown {
  const totals = { closed: 0, open: 0, future: 0 };
  for (const cycle of cycles) {
    if (cycle.remainingAmount <= 0) continue;
    totals[classifyCycleForLimit(cycle, today)] += cycle.remainingAmount;
  }
  const used = totals.closed + totals.open + totals.future;
  const limit = creditLimitAmount < 0 ? null : creditLimitAmount;

  return {
    limit,
    closedInvoice: totals.closed,
    openInvoice: totals.open,
    futureInvoices: totals.future,
    used,
    available: limit === null ? null : Math.max(limit - used, 0),
  };
}

/** Adds up cards of one currency. Cards without a limit add to `used` but not to the limit. */
export function sumLimitBreakdowns(breakdowns: readonly LimitBreakdown[]): LimitBreakdown {
  const limited = breakdowns.filter((item) => item.limit !== null);
  const sum = (pick: (item: LimitBreakdown) => number) =>
    breakdowns.reduce((total, item) => total + pick(item), 0);

  return {
    limit:
      limited.length === 0 ? null : limited.reduce((total, item) => total + (item.limit ?? 0), 0),
    closedInvoice: sum((item) => item.closedInvoice),
    openInvoice: sum((item) => item.openInvoice),
    futureInvoices: sum((item) => item.futureInvoices),
    used: sum((item) => item.used),
    available:
      limited.length === 0
        ? null
        : limited.reduce((total, item) => total + (item.available ?? 0), 0),
  };
}

/**
 * The month (`YYYY-MM`) of the invoice to show first: the oldest invoice that still needs
 * attention (closed and unpaid, or overdue) or, when none, the open one that new purchases land in.
 * Paid invoices are skipped, so the month after a paid invoice is shown, like a bank app does.
 * `fallbackMonth` is used when no card has such an invoice.
 */
export function pickDefaultInvoiceMonth(
  invoices: ReadonlyArray<{
    dueDate: string;
    displayStatus: "current" | "upcoming" | "due" | "overdue" | "paid";
  }>,
  fallbackMonth: string,
): string {
  const active = invoices
    .filter(
      (invoice) =>
        invoice.displayStatus === "overdue" ||
        invoice.displayStatus === "due" ||
        invoice.displayStatus === "current",
    )
    .map((invoice) => invoice.dueDate.slice(0, 7))
    .sort();

  return active[0] ?? fallbackMonth;
}
