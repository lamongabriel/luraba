import {
  addDays,
  dateWithClampedDay,
  formatISODate,
  getUTCDate,
  getUTCFullYear,
  getUTCMonth,
  parseISODate,
} from "./date.js";

export type LoanPaymentFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "annually"
  | "other";

/** Payments per year for a frequency, or null when it has no fixed cadence (`other`). */
export function loanPaymentsPerYear(
  frequency: LoanPaymentFrequency | null | undefined,
): number | null {
  switch (frequency) {
    case "weekly":
      return 52;
    case "biweekly":
      return 26;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "annually":
      return 1;
    default:
      return null;
  }
}

/** The due date of payment number `index` (1 is the first one after `startDate`). */
export function loanDueDate(
  startDate: string,
  frequency: Exclude<LoanPaymentFrequency, "other">,
  index: number,
): string {
  const start = parseISODate(startDate);
  if (frequency === "weekly") return formatISODate(addDays(start, 7 * index));
  if (frequency === "biweekly") return formatISODate(addDays(start, 14 * index));
  const months = (frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12) * index;
  const monthIndex = getUTCMonth(start) + months;
  const year = getUTCFullYear(start) + Math.floor(monthIndex / 12);
  return formatISODate(dateWithClampedDay(year, ((monthIndex % 12) + 12) % 12, getUTCDate(start)));
}

/** Payment that clears `principal` (minor units) in `payments` equal installments. */
export function loanScheduledPayment(
  principal: number,
  annualRatePercent: number,
  paymentsPerYear: number,
  payments: number,
): number {
  if (payments <= 0) return principal;
  const rate = annualRatePercent / 100 / paymentsPerYear;
  if (rate === 0) return Math.round(principal / payments);
  return Math.round((principal * rate) / (1 - (1 + rate) ** -payments));
}

export interface LoanScheduleRow {
  number: number;
  dueDate: string;
  payment: number;
  interest: number;
  principal: number;
  /** Balance left after this payment. */
  balance: number;
}

/**
 * Walks a loan payment by payment: interest on the balance each period, the rest of the payment
 * reduces the principal. The last payment is trimmed to what is left. Stops when paid off or after
 * `maxPayments` (a payment that does not cover the interest never pays off).
 */
export function buildLoanSchedule(input: {
  balance: number;
  annualRatePercent: number;
  payment: number;
  frequency: Exclude<LoanPaymentFrequency, "other">;
  /** The day the first payment falls on is one period after this date. */
  startDate: string;
  /** Number of payments already skipped before the first returned row. */
  firstNumber?: number;
  maxPayments?: number;
}): LoanScheduleRow[] {
  const perYear = loanPaymentsPerYear(input.frequency) ?? 12;
  const rate = input.annualRatePercent / 100 / perYear;
  const maxPayments = input.maxPayments ?? 1200;
  const rows: LoanScheduleRow[] = [];
  let balance = input.balance;
  for (let step = 1; balance > 0 && rows.length < maxPayments; step += 1) {
    const interest = Math.round(balance * rate);
    const payment = Math.min(input.payment, balance + interest);
    const principal = payment - interest;
    balance = Math.max(0, balance - principal);
    rows.push({
      number: (input.firstNumber ?? 0) + step,
      dueDate: loanDueDate(input.startDate, input.frequency, (input.firstNumber ?? 0) + step),
      payment,
      interest,
      principal,
      balance,
    });
    if (principal <= 0) break;
  }
  return rows;
}

export interface LoanOutlook {
  /** The first scheduled payment due on or after `today`; null once the schedule ended. */
  nextPayment: LoanScheduleRow | null;
  paymentsMade: number;
  paymentsTotal: number;
  /** Interest in the payments whose due date has passed. */
  interestPaid: number;
  totalInterest: number;
  /** Due date of the last scheduled payment; null when the payment never clears the loan. */
  payoffDate: string | null;
  /** Balance the schedule expects at `today`. */
  scheduledBalance: number;
}

/** What the loan terms predict for `today` (ISO date). Null when the terms are incomplete. */
export function summarizeLoan(
  terms: {
    principal: number | null;
    annualRatePercent: number | null;
    paymentAmount: number | null;
    termMonths: number | null;
    frequency: LoanPaymentFrequency | null;
    startDate: string | null;
  },
  today: string,
): LoanOutlook | null {
  const perYear = loanPaymentsPerYear(terms.frequency);
  if (!terms.principal || !terms.startDate || !perYear || terms.frequency === "other") return null;
  if (!terms.frequency) return null;
  const rate = terms.annualRatePercent ?? 0;
  const termPayments = terms.termMonths ? Math.round((terms.termMonths / 12) * perYear) : null;
  const payment =
    terms.paymentAmount ??
    (termPayments ? loanScheduledPayment(terms.principal, rate, perYear, termPayments) : null);
  if (!payment) return null;

  const schedule = buildLoanSchedule({
    balance: terms.principal,
    annualRatePercent: rate,
    payment,
    frequency: terms.frequency,
    startDate: terms.startDate,
    maxPayments: Math.max(termPayments ?? 0, 1200),
  });
  const last = schedule.at(-1);
  const paid = schedule.filter((row) => row.dueDate < today);
  return {
    nextPayment: schedule.find((row) => row.dueDate >= today) ?? null,
    paymentsMade: paid.length,
    paymentsTotal: schedule.length,
    interestPaid: paid.reduce((total, row) => total + row.interest, 0),
    totalInterest: schedule.reduce((total, row) => total + row.interest, 0),
    payoffDate: last && last.balance === 0 ? last.dueDate : null,
    scheduledBalance: paid.at(-1)?.balance ?? terms.principal,
  };
}
