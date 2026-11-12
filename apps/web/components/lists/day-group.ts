import {
  addDays,
  formatDisplayDate,
  formatISODate,
  parseISODate,
  todayISODate,
} from "@luraba/domain";

/**
 * The group a dated row falls in when a mobile list is grouped by day: `Today`, `Yesterday`, then
 * `Mon, Nov 10` (the year is added for other years). Dates are `YYYY-MM-DD` (or ISO datetimes).
 */
export function dayGroup(
  value: string,
  language = "en",
  today: string = todayISODate(),
): { key: string; label: string } {
  const day = value.slice(0, 10);
  if (day === today) return { key: day, label: "Today" };
  const yesterday = formatISODate(addDays(parseISODate(today), -1));
  if (day === yesterday) return { key: day, label: "Yesterday" };
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return {
    key: day,
    label: formatDisplayDate(day, {
      language,
      formatString: sameYear ? "EEE, MMM d" : "EEE, MMM d, yyyy",
    }),
  };
}
