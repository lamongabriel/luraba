import type { SplitInstallment } from "@luraba/contracts";

export const INSTALLMENT_STATE_LABELS: Record<SplitInstallment["state"], string> = {
  scheduled: "Upcoming",
  overdue: "Overdue",
  received: "Received",
  skipped: "Skipped",
  written_off: "Written off",
};

/** Same day each month, clamped to short months, starting at the first due date. */
export function generateMonthlyInstallments(
  count: number,
  expectedAmount: number,
  firstDueDate: string,
): Array<{ dueDate: string; expectedAmount: number }> {
  const [year = 0, month = 1, day = 1] = firstDueDate.split("-").map(Number);

  return Array.from({ length: count }, (_, index) => {
    const lastDay = new Date(Date.UTC(year, month + index, 0)).getUTCDate();
    const date = new Date(Date.UTC(year, month - 1 + index, Math.min(day, lastDay)));
    return { dueDate: date.toISOString().slice(0, 10), expectedAmount };
  });
}
