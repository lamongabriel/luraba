import { formatNumber } from "@/lib/finance";

/** Percent values from the API are already in percent units (`"12.5"` is 12.5%). */
export function formatPercent(value: string | number | null | undefined, language = "en") {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${formatNumber(number, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatSignedPercent(value: string | number | null | undefined, language = "en") {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const text = formatPercent(Math.abs(number), language);
  if (number > 0) return `+${text}`;
  if (number < 0) return `-${text}`;
  return text;
}

/** A quantity or rate held as an exact decimal string; shows up to `maxDecimals` places. */
export function formatQuantity(
  value: string | number | null | undefined,
  language = "en",
  maxDecimals = 8,
) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return formatNumber(number, language, { maximumFractionDigits: maxDecimals });
}

/** A unit price in the asset currency (not minor units): keeps at least 2 and up to 6 decimals. */
export function formatUnitPrice(
  value: string | number | null | undefined,
  currencyCode: string,
  language = "en",
) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return formatNumber(number, language, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export type Sign = "positive" | "negative" | "zero";

export function signOf(value: string | number | null | undefined): Sign {
  const number = Number(value ?? 0);
  if (number > 0) return "positive";
  if (number < 0) return "negative";
  return "zero";
}

/** "just now", "3 min ago", "2 h ago", "4 d ago" from an ISO instant. */
export function formatAge(asOf: string | null | undefined, nowMs: number): string {
  if (!asOf) return "never";
  const diff = Math.max(0, nowMs - Date.parse(asOf));
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** A decimal fraction string such as a fixed-income rate (`"1.10"`) shown as a percent (`110%`). */
export function fractionToPercent(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number * 100 : null;
}
