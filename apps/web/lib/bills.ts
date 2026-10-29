import type { BillFrequency, BillOccurrence } from "@luraba/contracts";

export const BILL_FREQUENCY_OPTIONS: ReadonlyArray<{ value: BillFrequency; label: string }> = [
  { value: "monthly", label: "Every month" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "yearly", label: "Every year" },
];

export const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

export function usesDayOfMonth(frequency: BillFrequency) {
  return frequency === "monthly" || frequency === "quarterly" || frequency === "yearly";
}

export function usesDayOfWeek(frequency: BillFrequency) {
  return frequency === "weekly" || frequency === "biweekly";
}

export function formatOrdinal(day: number) {
  const rest = day % 100;
  if (rest >= 11 && rest <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function describeBillSchedule(bill: {
  frequency: BillFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
}) {
  if (usesDayOfMonth(bill.frequency) && bill.dayOfMonth) {
    const every = { monthly: "month", quarterly: "3 months", yearly: "year" } as const;
    return `Every ${every[bill.frequency as "monthly" | "quarterly" | "yearly"]} on the ${formatOrdinal(bill.dayOfMonth)}`;
  }
  const weekday = WEEKDAY_OPTIONS.find((option) => Number(option.value) === bill.dayOfWeek)?.label;
  const every = bill.frequency === "biweekly" ? "2 weeks" : "week";
  return weekday ? `Every ${every} on ${weekday}` : `Every ${every}`;
}

export const OCCURRENCE_STATE_LABELS: Record<BillOccurrence["state"], string> = {
  scheduled: "Upcoming",
  overdue: "Overdue",
  paid: "Paid",
  skipped: "Skipped",
};
