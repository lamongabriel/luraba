import {
  addDays,
  dateWithClampedDay,
  formatISODate,
  getUTCDate,
  getUTCFullYear,
  getUTCMonth,
  isAfter,
  isBefore,
  parseISODate,
  toDate,
} from "./date.js";

export const RECURRENCY_FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export type RecurrencyFrequency = (typeof RECURRENCY_FREQUENCIES)[number];
export type RecurrencyDateInput = Date | string | number;

export type RecurrencyRule = {
  frequency: RecurrencyFrequency;
  startDate: RecurrencyDateInput;
  endDate?: RecurrencyDateInput | null;
  occurrences?: number | null;
  interval?: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
};

export type RecurrencyRange = {
  from?: RecurrencyDateInput;
  to?: RecurrencyDateInput;
};

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

function getInterval(rule: RecurrencyRule): number {
  const interval = rule.interval ?? 1;
  assertPositiveInteger(interval, "Recurrency interval");
  return interval;
}

function normalizeDate(value: RecurrencyDateInput): Date {
  return parseISODate(formatISODate(toDate(value)));
}

function getFirstDate(rule: RecurrencyRule): Date {
  const startDate = normalizeDate(rule.startDate);

  if (
    (rule.frequency !== "weekly" && rule.frequency !== "biweekly") ||
    rule.dayOfWeek === null ||
    rule.dayOfWeek === undefined
  ) {
    return startDate;
  }

  assertPositiveInteger(rule.dayOfWeek + 1, "Recurrency day of week");
  return addDays(startDate, (rule.dayOfWeek - startDate.getUTCDay() + 7) % 7);
}

function getNextDate(date: Date, rule: RecurrencyRule, dayOfMonth: number): Date {
  const interval = getInterval(rule);
  const year = getUTCFullYear(date);
  const month = getUTCMonth(date);

  if (rule.frequency === "weekly" || rule.frequency === "biweekly") {
    const weeks = interval * (rule.frequency === "weekly" ? 1 : 2);
    return addDays(date, weeks * 7);
  }

  if (rule.frequency === "daily") {
    return addDays(date, interval);
  }

  const months =
    interval * (rule.frequency === "quarterly" ? 3 : rule.frequency === "yearly" ? 12 : 1);
  const targetMonth = month + months;
  return dateWithClampedDay(year + Math.floor(targetMonth / 12), targetMonth % 12, dayOfMonth);
}

/**
 * Generates inclusive UTC dates for a generic recurrency rule.
 *
 * A rule must provide at least one stopping condition: `occurrences`, `endDate`,
 * or `range.to`. When a range is supplied, occurrences are counted from the
 * rule's first date before dates outside the range are filtered out.
 */
export function getRecurrencyDates(rule: RecurrencyRule, range: RecurrencyRange = {}): Date[] {
  if (!RECURRENCY_FREQUENCIES.includes(rule.frequency)) {
    throw new RangeError(`Unsupported recurrency frequency: ${String(rule.frequency)}`);
  }

  if (rule.occurrences !== null && rule.occurrences !== undefined) {
    assertPositiveInteger(rule.occurrences, "Recurrency occurrences");
  }

  if (rule.dayOfMonth !== null && rule.dayOfMonth !== undefined) {
    assertPositiveInteger(rule.dayOfMonth, "Recurrency day of month");
    if (rule.dayOfMonth > 31) {
      throw new RangeError("Recurrency day of month must be between 1 and 31");
    }
  }

  if (
    rule.dayOfWeek !== null &&
    rule.dayOfWeek !== undefined &&
    (!Number.isInteger(rule.dayOfWeek) || rule.dayOfWeek < 0 || rule.dayOfWeek > 6)
  ) {
    throw new RangeError("Recurrency day of week must be between 0 and 6");
  }

  const firstDate = getFirstDate(rule);
  const from = range.from ? normalizeDate(range.from) : firstDate;
  const ruleEndDate = rule.endDate ? normalizeDate(rule.endDate) : undefined;
  const to = range.to ? normalizeDate(range.to) : ruleEndDate;

  if ((!to && rule.occurrences === null) || (!to && rule.occurrences === undefined)) {
    throw new RangeError("Recurrency requires occurrences, endDate, or range.to");
  }

  const limit = to && ruleEndDate && isBefore(ruleEndDate, to) ? ruleEndDate : to;
  const dayOfMonth = rule.dayOfMonth ?? getUTCDate(firstDate);
  const dates: Date[] = [];
  let current = firstDate;
  let generated = 0;

  while (
    rule.occurrences === null ||
    rule.occurrences === undefined ||
    generated < rule.occurrences
  ) {
    if (limit && isAfter(current, limit)) break;
    if (!isBefore(current, from)) dates.push(current);
    generated += 1;
    current = getNextDate(current, rule, dayOfMonth);
  }

  return dates;
}

/** Maps each generated occurrence into a module-specific representation. */
export function mapRecurrency<T>(
  rule: RecurrencyRule,
  range: RecurrencyRange = {},
  map: (date: Date, index: number) => T,
): T[] {
  return getRecurrencyDates(rule, range).map(map);
}
