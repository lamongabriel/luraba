import { z } from "zod";

export const periodInput = {
  period: z
    .enum(["this_month", "last_month", "last_30_days", "this_year", "custom"])
    .default("this_month")
    .describe("Named period; use custom with dateFrom/dateTo for anything else."),
  dateFrom: z.iso.date().optional().describe("custom period start (YYYY-MM-DD)."),
  dateTo: z.iso.date().optional().describe("custom period end (YYYY-MM-DD)."),
};

function iso(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/** Inclusive date range for a named period, relative to `today` (YYYY-MM-DD in the household zone). */
export function periodRange(
  today: string,
  input: { period: string; dateFrom?: string | undefined; dateTo?: string | undefined },
): { dateFrom: string; dateTo: string } {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  switch (input.period) {
    case "last_month":
      return { dateFrom: iso(y, m - 2, 1), dateTo: iso(y, m - 1, 0) };
    case "last_30_days":
      return { dateFrom: iso(y, m - 1, d - 29), dateTo: today };
    case "this_year":
      return { dateFrom: iso(y, 0, 1), dateTo: today };
    case "custom":
      return { dateFrom: input.dateFrom ?? iso(y, m - 1, 1), dateTo: input.dateTo ?? today };
    default:
      return { dateFrom: iso(y, m - 1, 1), dateTo: today };
  }
}

export function monthKey(today: string, offset = 0): string {
  const [y, m] = today.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 7);
}
