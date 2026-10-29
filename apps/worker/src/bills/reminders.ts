import { daysUntilDue } from "@luraba/domain";

/** Days after the due date on which an unpaid bill is nagged about again. */
export const OVERDUE_MILESTONES = [1, 3, 7] as const;
/** Reminders go out once the household's local time reaches this hour. */
export const REMINDER_HOUR = 9;

export type ReminderCandidate = {
  dueDate: Date;
  today: Date;
  remindDaysBefore: number | null;
  /** Date the bill was created; earlier occurrences are backfilled history and never remind. */
  createdDate: Date;
};

export type Reminder =
  | { event: "bill.due_soon"; daysBefore: number; key: string }
  | { event: "bill.overdue"; daysLate: number; milestone: number; key: string };

/**
 * Decides which reminder, if any, an unpaid occurrence needs today. The key is
 * stable across runs so the hourly job can safely evaluate it many times.
 */
export function planReminder(candidate: ReminderCandidate): Reminder | undefined {
  if (candidate.dueDate < candidate.createdDate) return undefined;

  const daysUntil = daysUntilDue(candidate.dueDate, candidate.today);

  if (daysUntil >= 0) {
    const early = candidate.remindDaysBefore;
    if (daysUntil === 0 || (early !== null && early > 0 && daysUntil === early)) {
      return { event: "bill.due_soon", daysBefore: daysUntil, key: `bill.due_soon:${daysUntil}` };
    }
    return undefined;
  }

  const daysLate = -daysUntil;
  // The highest milestone reached, so a missed day still produces the reminder once.
  const milestone = [...OVERDUE_MILESTONES].reverse().find((value) => daysLate >= value);
  if (milestone === undefined) return undefined;

  return { event: "bill.overdue", daysLate, milestone, key: `bill.overdue:${milestone}` };
}

export function getLocalHour(timezone: string, at: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(at);
  return Number(hour);
}

/** Midnight UTC of the calendar day that `at` falls on in the given timezone. */
export function getLocalDate(timezone: string, at: Date): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  return new Date(`${iso}T00:00:00.000Z`);
}

export function formatMoney(amountMinor: number, currencyCode: string): string {
  try {
    const format = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode });
    const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
    return format.format(amountMinor / 10 ** digits);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currencyCode}`;
  }
}

export function buildReminderMessage(
  reminder: Reminder,
  bill: { name: string; amount: number; currencyCode: string },
): { title: string; body: string } {
  const amount = formatMoney(bill.amount, bill.currencyCode);

  if (reminder.event === "bill.due_soon") {
    if (reminder.daysBefore === 0) {
      return {
        title: `${bill.name} is due today`,
        body: `Expected ${amount}. Don't forget to pay it.`,
      };
    }
    const days = reminder.daysBefore === 1 ? "tomorrow" : `in ${reminder.daysBefore} days`;
    return { title: `${bill.name} is due ${days}`, body: `Expected ${amount}.` };
  }

  const days = reminder.daysLate === 1 ? "1 day" : `${reminder.daysLate} days`;
  return {
    title: `You forgot to pay ${bill.name}`,
    body: `It was due ${days} ago (${amount}). Pay it and link the transaction to clear this.`,
  };
}
