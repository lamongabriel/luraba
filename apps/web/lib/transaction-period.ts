import type { UserPreferredPeriod, UserTimezone } from "@luraba/contracts"
import {
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns"

function getTodayInTimezone(timezone: UserTimezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date())
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>

  // Midday UTC keeps the calendar date stable while date-fns performs local
  // calendar operations in browsers configured for another timezone.
  return new Date(Date.UTC(values.year, values.month - 1, values.day, 12))
}

function toDate(value: Date) {
  return format(value, "yyyy-MM-dd")
}

export function getPreferredTransactionDateRange(
  period: UserPreferredPeriod,
  timezone: UserTimezone,
) {
  const today = getTodayInTimezone(timezone)

  switch (period) {
    case "last_day":
      return { dateFrom: toDate(today), dateTo: toDate(today) }
    case "current_week":
      return {
        dateFrom: toDate(startOfWeek(today, { weekStartsOn: 1 })),
        dateTo: toDate(today),
      }
    case "last_7_days":
      return { dateFrom: toDate(subDays(today, 6)), dateTo: toDate(today) }
    case "current_month":
      return { dateFrom: toDate(startOfMonth(today)), dateTo: toDate(today) }
    case "last_month": {
      const month = subMonths(today, 1)
      return {
        dateFrom: toDate(startOfMonth(month)),
        dateTo: toDate(endOfMonth(month)),
      }
    }
    case "last_30_days":
      return { dateFrom: toDate(subDays(today, 29)), dateTo: toDate(today) }
    case "last_90_days":
      return { dateFrom: toDate(subDays(today, 89)), dateTo: toDate(today) }
    case "current_year":
      return { dateFrom: toDate(startOfYear(today)), dateTo: toDate(today) }
    case "last_365_days":
      return { dateFrom: toDate(subDays(today, 364)), dateTo: toDate(today) }
    case "last_5_years":
      return {
        dateFrom: toDate(startOfYear(subYears(today, 4))),
        dateTo: toDate(today),
      }
    case "last_10_years":
      return {
        dateFrom: toDate(startOfYear(subYears(today, 9))),
        dateTo: toDate(today),
      }
    case "all_time":
      return { dateFrom: undefined, dateTo: undefined }
  }
}
