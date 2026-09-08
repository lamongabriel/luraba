import {
  endOfMonth,
  formatISODate,
  getTodayInTimezone,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "./date.js";

export type DateRange = { dateFrom: string; dateTo: string };

export function isDateRangeReversed(range: DateRange): boolean {
  return range.dateFrom > range.dateTo;
}

export function clampDateToToday(date: string, today: string): string {
  return date > today ? today : date;
}

export type PreferredPeriod =
  | "last_day"
  | "current_week"
  | "last_7_days"
  | "current_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "current_year"
  | "last_365_days"
  | "last_5_years"
  | "last_10_years"
  | "all_time";

export type OptionalDateRange = { dateFrom?: string; dateTo?: string };

/** Builds a preferred transaction range without coupling the domain to an app or UI. */
export function getPreferredDateRange(
  period: PreferredPeriod,
  timezone: string,
): OptionalDateRange {
  const today = getTodayInTimezone(timezone);
  const format = (date: Date) => formatISODate(date);

  switch (period) {
    case "last_day":
      return { dateFrom: format(today), dateTo: format(today) };
    case "current_week":
      return { dateFrom: format(startOfWeek(today, { weekStartsOn: 1 })), dateTo: format(today) };
    case "last_7_days":
      return { dateFrom: format(subDays(today, 6)), dateTo: format(today) };
    case "current_month":
      return { dateFrom: format(startOfMonth(today)), dateTo: format(today) };
    case "last_month": {
      const month = subMonths(today, 1);
      return { dateFrom: format(startOfMonth(month)), dateTo: format(endOfMonth(month)) };
    }
    case "last_30_days":
      return { dateFrom: format(subDays(today, 29)), dateTo: format(today) };
    case "last_90_days":
      return { dateFrom: format(subDays(today, 89)), dateTo: format(today) };
    case "current_year":
      return { dateFrom: format(startOfYear(today)), dateTo: format(today) };
    case "last_365_days":
      return { dateFrom: format(subDays(today, 364)), dateTo: format(today) };
    case "last_5_years":
      return { dateFrom: format(startOfYear(subYears(today, 4))), dateTo: format(today) };
    case "last_10_years":
      return { dateFrom: format(startOfYear(subYears(today, 9))), dateTo: format(today) };
    case "all_time":
      return { dateFrom: undefined, dateTo: undefined };
  }
}
