/**
 * Bridge between the app's plain `YYYY-MM-DD` date strings and the local `Date` objects that
 * `react-day-picker` works with. The calendar only ever shows whole days, so the local calendar
 * fields are used on purpose here (and nowhere else): they keep the day the user clicked.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** `"2026-11-01"` -> a local Date on that calendar day, or `undefined` when it is not a valid date. */
export function isoToCalendarDate(value: string | null | undefined): Date | undefined {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

/** A calendar day -> `"YYYY-MM-DD"`. */
export function calendarDateToIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
