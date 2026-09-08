import {
  addDays as dfnsAddDays,
  addMonths as dfnsAddMonths,
  isAfter as dfnsIsAfter,
  isBefore as dfnsIsBefore,
  isEqual as dfnsIsEqual,
  startOfMonth as dfnsStartOfMonth,
  subDays as dfnsSubDays,
} from "date-fns";

// ---------------------------------------------------------------------------
// Primitives - thin wrappers around date-fns + ISO formatting/parsing
// ---------------------------------------------------------------------------

/** Returns the current date/time. Centralizes all `new Date()` calls. */
export function now(): Date {
  return new Date();
}

/** Formats a Date as an ISO date string: `"YYYY-MM-DD"`. */
export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Formats a Date as a full ISO datetime string: `"YYYY-MM-DDTHH:mm:ss.sssZ"`. */
export function formatISODateTime(date: Date): string {
  return date.toISOString();
}

/** Parses an ISO date string (`"YYYY-MM-DD"`) into a UTC midnight Date. */
export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Parses a full ISO datetime string into a Date. */
export function parseISODateTime(value: string): Date {
  return new Date(value);
}

/** Add days to a date. */
export function addDays(date: Date, days: number): Date {
  return dfnsAddDays(date, days);
}

/**
 * Add months to a date, forcing the day to the 1st of the target month.
 * Matches existing API semantics where budget/cycle months always start on day 1.
 */
export function addMonths(date: Date, months: number): Date {
  return dfnsAddMonths(dfnsStartOfMonth(date), months);
}

/** Subtract days from a date. */
export function subDays(date: Date, days: number): Date {
  return dfnsSubDays(date, days);
}

/** Returns the start of the month (UTC midnight on the 1st). */
export function startOfMonth(date: Date): Date {
  return dfnsStartOfMonth(date);
}

/** Returns `true` if `date` is before `compare`. */
export function isBefore(date: Date, compare: Date): boolean {
  return dfnsIsBefore(date, compare);
}

/** Returns `true` if `date` is after `compare`. */
export function isAfter(date: Date, compare: Date): boolean {
  return dfnsIsAfter(date, compare);
}

/** Returns `true` if two dates represent the same instant. */
export function isEqual(date: Date, compare: Date): boolean {
  return dfnsIsEqual(date, compare);
}

/** Returns `true` if two dates are the same calendar day (UTC). */
export function isSameDay(date: Date, compare: Date): boolean {
  return formatISODate(date) === formatISODate(compare);
}

/** Get UTC year from a date. */
export function getUTCFullYear(date: Date): number {
  return date.getUTCFullYear();
}

/** Get UTC month (0-indexed) from a date. */
export function getUTCMonth(date: Date): number {
  return date.getUTCMonth();
}

/** Get UTC day of month from a date. */
export function getUTCDate(date: Date): number {
  return date.getUTCDate();
}

// ---------------------------------------------------------------------------
// Timezone
// ---------------------------------------------------------------------------

/**
 * Returns a UTC Date representing "today" in the given IANA timezone.
 * The result is midnight UTC on that calendar day.
 */
export function getTodayInTimezone(timezone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now());
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1);

  return new Date(Date.UTC(year, month - 1, day));
}

// ---------------------------------------------------------------------------
// Domain helpers - business logic relocated from per-module utils
// ---------------------------------------------------------------------------

/** Clamps a day-of-month so it doesn't exceed the last day of the given month. */
export function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

/** Constructs a UTC Date with the day clamped to the month's maximum. */
export function dateWithClampedDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, clampDayOfMonth(year, monthIndex, day)));
}

/**
 * Given a closing date, closing day-of-month, and due day-of-month,
 * computes the full billing cycle: periodStart, periodEnd, closingDate, dueDate.
 */
export function buildCycleFromClosingDate(closingDate: Date, closingDay: number, dueDay: number) {
  const previousClosing = dateWithClampedDay(
    closingDate.getUTCFullYear(),
    closingDate.getUTCMonth() - 1,
    closingDay,
  );
  const periodStart = addDays(previousClosing, 1);
  const periodEnd = closingDate;

  let dueDate = dateWithClampedDay(closingDate.getUTCFullYear(), closingDate.getUTCMonth(), dueDay);
  if (!isAfter(dueDate, closingDate)) {
    dueDate = dateWithClampedDay(
      closingDate.getUTCFullYear(),
      closingDate.getUTCMonth() + 1,
      dueDay,
    );
  }

  return {
    periodStart,
    periodEnd,
    closingDate,
    dueDate,
  };
}

export function buildCycleForPurchaseDate(purchaseDate: Date, closingDay: number, dueDay: number) {
  const purchaseYear = getUTCFullYear(purchaseDate);
  const purchaseMonth = getUTCMonth(purchaseDate);
  const sameMonthClosing = dateWithClampedDay(purchaseYear, purchaseMonth, closingDay);
  const closingDate = !isAfter(purchaseDate, sameMonthClosing)
    ? sameMonthClosing
    : dateWithClampedDay(purchaseYear, purchaseMonth + 1, closingDay);

  return buildCycleFromClosingDate(closingDate, closingDay, dueDay);
}

/** Formats a Date as a month key: `"YYYY-MM"`. */
export function formatMonthKey(date: Date): string {
  return `${getUTCFullYear(date)}-${String(getUTCMonth(date) + 1).padStart(2, "0")}`;
}

/** Parses a month key (`"YYYY-MM"`) into a UTC midnight Date on the 1st. */
export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Normalizes a Date to the start of its UTC day (midnight UTC). */
export function toStartOfDay(date: Date): Date {
  return parseISODate(formatISODate(date));
}
