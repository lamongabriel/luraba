import { formatCurrency } from "@/lib/finance";

/** Most installments the API accepts (`installmentCountSchema` in `@luraba/contracts`). */
export const MAX_INSTALLMENTS = 48;

/** Options for the installments select: `1` to `MAX_INSTALLMENTS`. */
export const INSTALLMENT_COUNT_OPTIONS = Array.from({ length: MAX_INSTALLMENTS }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}x`,
}));

/**
 * Splits a purchase into installments exactly like the API (`splitInstallmentAmounts`): every
 * installment is `floor(total / count)` and the last one takes the remainder.
 */
export function splitInstallments(totalMinor: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) return [];
  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor - base * count;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? base + remainder : base,
  );
}

/**
 * A live summary for the form: `"5 installments of $600.00"`, or when the last one differs because
 * of rounding, `"5 installments: 4 of $333.33 and 1 of $333.35"`. Empty for a single payment or an
 * unusable amount.
 */
export function describeInstallments(
  totalMinor: number,
  count: number,
  currencyCode: string,
  language = "en",
  precision = 2,
): string {
  if (count < 2 || !Number.isFinite(totalMinor) || totalMinor <= 0) return "";
  const parts = splitInstallments(totalMinor, count);
  const money = (amount: number) =>
    formatCurrency(amount, currencyCode, language, undefined, precision);
  const regular = parts[0] ?? 0;
  const last = parts[parts.length - 1] ?? 0;
  if (last === regular) return `${count} installments of ${money(regular)}`;
  return `${count} installments: ${count - 1} of ${money(regular)} and 1 of ${money(last)}`;
}
