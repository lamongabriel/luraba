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
  /** Payments no invoice absorbs yet (card credit): they free limit, open invoice first. */
  creditBalance = 0,
): LimitBreakdown {
  const totals = { closed: 0, open: 0, future: 0 };
  for (const cycle of cycles) {
    if (cycle.remainingAmount <= 0) continue;
    totals[classifyCycleForLimit(cycle, today)] += cycle.remainingAmount;
  }
  let credit = Math.max(creditBalance, 0);
  for (const bucket of ["closed", "open", "future"] as const) {
    const used = Math.min(totals[bucket], credit);
    totals[bucket] -= used;
    credit -= used;
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

export type AllocationPayment = { id: string; amount: number };
export type AllocationInvoice = {
  id: string;
  statementAmount: number;
  /**
   * Whether payments may be applied to it. Only closed invoices are: an open invoice's statement is
   * still moving, so money that exceeds the closed invoices stays card credit until it closes.
   * Defaults to true.
   */
  payable?: boolean;
};
export type PaymentAllocation = { paymentId: string; invoiceId: string; amount: number };
export type PaymentAllocationResult = {
  allocations: PaymentAllocation[];
  /** Per invoice: how much of its statement the payments cover (never above the statement). */
  paidByInvoice: Map<string, number>;
  /** Payments that no invoice could absorb: the card credit balance, in minor units. */
  creditBalance: number;
};

/**
 * Pure, deterministic payment allocation for ONE card. `payments` must already be ordered
 * (oldest first) and `invoices` oldest first (by due date). Each payment fills the oldest payable
 * invoice that still has something to pay, capped at that invoice's statement. Whatever no invoice
 * can absorb is the card credit balance; it is never attached to an invoice (and settles later
 * invoices by itself once they become payable, because the whole card is recomputed). Recomputing from scratch
 * after any change is what keeps "paid" equal to min(statement, payments) with no phantom cents.
 */
export function allocatePayments(
  payments: readonly AllocationPayment[],
  invoices: readonly AllocationInvoice[],
): PaymentAllocationResult {
  const open = invoices.map((invoice) => ({
    id: invoice.id,
    remaining: invoice.payable === false ? 0 : Math.max(invoice.statementAmount, 0),
  }));
  const paidByInvoice = new Map(invoices.map((invoice) => [invoice.id, 0]));
  const allocations: PaymentAllocation[] = [];
  let creditBalance = 0;

  for (const payment of payments) {
    let left = Math.max(payment.amount, 0);
    for (const invoice of open) {
      if (left <= 0) break;
      if (invoice.remaining <= 0) continue;
      const amount = Math.min(invoice.remaining, left);
      invoice.remaining -= amount;
      left -= amount;
      paidByInvoice.set(invoice.id, (paidByInvoice.get(invoice.id) ?? 0) + amount);
      allocations.push({ paymentId: payment.id, invoiceId: invoice.id, amount });
    }
    creditBalance += left;
  }

  return { allocations, paidByInvoice, creditBalance };
}
