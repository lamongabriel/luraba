import { formatDisplayDate, formatShortDate } from "@luraba/domain";

import { formatCurrency, formatNumber, minorToMajorUnits } from "@/lib/finance";

export type ChartBucket = "day" | "week" | "month";

export interface ChartFormatOptions {
  currencyCode: string;
  precision?: number;
  language?: string;
}

/** Full money text for tooltips and legends. */
export function formatChartMoney(minor: number, options: ChartFormatOptions): string {
  return formatCurrency(
    minor,
    options.currencyCode,
    options.language,
    undefined,
    options.precision,
  );
}

/** Short money text for axis ticks: `12K`, `1.5M`, no currency symbol (the tooltip has it). */
export function formatChartAxisMoney(minor: number, options: ChartFormatOptions): string {
  return formatNumber(minorToMajorUnits(minor, options.precision ?? 2), options.language, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** A bucket start (`YYYY-MM-DD`) as an axis tick: `Mar 5`, or `Mar 2026` for monthly buckets. */
export function formatChartDate(
  value: string,
  bucket: ChartBucket = "day",
  language = "en",
): string {
  return formatDisplayDate(value, {
    formatString: bucket === "month" ? "MMM yyyy" : "MMM d",
    language,
  });
}

/** The longer tooltip title for a bucket. */
export function formatChartDateLabel(
  value: string,
  bucket: ChartBucket = "day",
  language = "en",
): string {
  if (bucket === "month") return formatChartDate(value, "month", language);
  const day = formatShortDate(value, language);
  return bucket === "week" ? `Week of ${day}` : day;
}
