export type DateRange = { dateFrom: string; dateTo: string };

export function isDateRangeReversed(range: DateRange): boolean {
  return range.dateFrom > range.dateTo;
}

export function clampDateToToday(date: string, today: string): string {
  return date > today ? today : date;
}
