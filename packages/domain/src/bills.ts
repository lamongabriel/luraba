import {
  dateWithClampedDay,
  formatISODate,
  getUTCDate,
  getUTCFullYear,
  getUTCMonth,
  isBefore,
  parseISODate,
  toDate,
} from "./date.js";
import {
  getRecurrencyDates,
  type RecurrencyDateInput,
  type RecurrencyFrequency,
} from "./recurrency.js";

export type BillSchedule = {
  frequency: Exclude<RecurrencyFrequency, "daily">;
  startDate: RecurrencyDateInput;
  /** Last day a payment may fall on. Mutually exclusive with `installmentCount`. */
  endDate?: RecurrencyDateInput | null;
  /** Total payments of a finite plan. Mutually exclusive with `endDate`. */
  installmentCount?: number | null;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
};

export type BillDueDate = {
  dueDate: Date;
  /** 1-based position in a finite plan; null for open-ended bills. */
  installmentNumber: number | null;
};

const MONTHS_PER_PERIOD = { monthly: 1, quarterly: 3, yearly: 12 } as const;

/**
 * The generic recurrency rule starts on `startDate` itself. A bill that is due
 * "on the 28th" must start on the first 28th on or after its start date.
 */
function alignStartDate(schedule: BillSchedule): Date {
  const start = parseISODate(formatISODate(toDate(schedule.startDate)));
  const months = MONTHS_PER_PERIOD[schedule.frequency as keyof typeof MONTHS_PER_PERIOD];
  if (!months || !schedule.dayOfMonth) return start;

  const candidate = dateWithClampedDay(
    getUTCFullYear(start),
    getUTCMonth(start),
    schedule.dayOfMonth,
  );
  if (!isBefore(candidate, start)) return candidate;

  const target = getUTCMonth(start) + months;
  return dateWithClampedDay(
    getUTCFullYear(start) + Math.floor(target / 12),
    target % 12,
    schedule.dayOfMonth,
  );
}

/**
 * Due dates of a bill. Finite plans (`installmentCount`) always return every
 * payment; open-ended bills return payments up to `until`, which is required.
 */
export function getBillDueDates(schedule: BillSchedule, until: RecurrencyDateInput): BillDueDate[] {
  const startDate = alignStartDate(schedule);
  const finite = schedule.installmentCount != null;
  const dayOfMonth = schedule.dayOfMonth ?? getUTCDate(startDate);

  const dates = getRecurrencyDates(
    {
      frequency: schedule.frequency,
      startDate,
      endDate: schedule.endDate ?? null,
      occurrences: finite ? schedule.installmentCount : null,
      dayOfMonth: MONTHS_PER_PERIOD[schedule.frequency as keyof typeof MONTHS_PER_PERIOD]
        ? dayOfMonth
        : null,
      dayOfWeek: schedule.dayOfWeek ?? null,
    },
    finite ? {} : { to: until },
  );

  return dates.map((dueDate, index) => ({
    dueDate,
    installmentNumber: finite ? index + 1 : null,
  }));
}

/** Calendar days from `today` until `dueDate`; negative when overdue. */
export function daysUntilDue(dueDate: Date, today: Date): number {
  return Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
}
