import {
  addDays as dfnsAddDays,
  addMilliseconds as dfnsAddMilliseconds,
  addMonths as dfnsAddMonths,
  differenceInCalendarDays as dfnsDifferenceInCalendarDays,
  endOfMonth as dfnsEndOfMonth,
  format as dfnsFormat,
  isAfter as dfnsIsAfter,
  isBefore as dfnsIsBefore,
  isEqual as dfnsIsEqual,
  isValid as dfnsIsValid,
  parseISO as dfnsParseISO,
  startOfMonth as dfnsStartOfMonth,
  startOfWeek as dfnsStartOfWeek,
  startOfYear as dfnsStartOfYear,
  subDays as dfnsSubDays,
  subMonths as dfnsSubMonths,
  subYears as dfnsSubYears,
} from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

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

/** Converts a Date, ISO string, or timestamp into a Date. */
export function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return parseISODate(value);
  }
  return new Date(value);
}

/** Add days to a date. */
export function addDays(date: Date, days: number): Date {
  return dfnsAddDays(date, days);
}

/** Add milliseconds to a date. */
export function addMilliseconds(date: Date, milliseconds: number): Date {
  return dfnsAddMilliseconds(date, milliseconds);
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
/** Date-fns operations exposed through the shared domain package. */
export function differenceInCalendarDays(dateLeft: Date, dateRight: Date): number {
  return dfnsDifferenceInCalendarDays(dateLeft, dateRight);
}

export function endOfMonth(date: Date): Date {
  return dfnsEndOfMonth(date);
}

export function startOfWeek(
  date: Date,
  options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 },
): Date {
  return dfnsStartOfWeek(date, options);
}

export function startOfYear(date: Date): Date {
  return dfnsStartOfYear(date);
}

export function subMonths(date: Date, months: number): Date {
  return dfnsSubMonths(date, months);
}

export function subYears(date: Date, years: number): Date {
  return dfnsSubYears(date, years);
}

export function formatDatePattern(
  date: Date,
  pattern: string,
  options?: Parameters<typeof dfnsFormat>[2],
): string {
  return dfnsFormat(date, pattern, options);
}

export function isValidDate(date: Date): boolean {
  return dfnsIsValid(date);
}

export function parseDate(value: string): Date {
  return dfnsParseISO(value);
}

type DisplayDateInput = Date | string | number | null | undefined;
type DisplayDateLanguage = "en" | "pt-BR";

const DISPLAY_DATE_LOCALES = { en: enUS, "pt-BR": ptBR } as const;

function resolveDisplayDateLanguage(language: string | undefined): DisplayDateLanguage {
  return language === "pt-BR" ? "pt-BR" : "en";
}

function parseDisplayDate(value: DisplayDateInput): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? dfnsParseISO(/^\d{4}-\d{2}-\d{2}$/u.test(value) ? `${value}T12:00:00` : value)
        : new Date(value);

  return dfnsIsValid(date) ? date : undefined;
}

/** Formats a date for display using the requested language and pattern. */
export function formatDisplayDate(
  value: DisplayDateInput,
  options: {
    formatString?: string;
    language?: string;
    fallback?: string;
  } = {},
): string {
  const date = parseDisplayDate(value);
  if (!date) return options.fallback ?? "";

  return dfnsFormat(date, options.formatString ?? "MMMM d, yyyy", {
    locale: DISPLAY_DATE_LOCALES[resolveDisplayDateLanguage(options.language)],
  });
}

export function formatShortDisplayDate(value: DisplayDateInput, language = "en") {
  return formatDisplayDate(value, {
    language: resolveDisplayDateLanguage(language),
    formatString: "dd MMM yyyy",
  });
}

export { parseDisplayDate };
export const formatDate = formatDisplayDate;
export const formatShortDate = formatShortDisplayDate;
export const parseDateValue = parseDisplayDate;
