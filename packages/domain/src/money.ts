export function addMinorUnits(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function subtractMinorUnits(amount: number, ...subtrahends: number[]): number {
  return subtrahends.reduce((total, subtrahend) => total - subtrahend, amount);
}

export function toMinorUnits(value: number, precision: number): number {
  return Math.round(value * 10 ** precision);
}

export function fromMinorUnits(value: number, precision: number): number {
  return value / 10 ** precision;
}

export type FormatMoneyOptions = {
  /** BCP 47 locale. Defaults to `en-US`. */
  locale?: string;
  /** Decimal places. Defaults to the currency's own (2 for USD, 0 for JPY). */
  precision?: number;
};

/**
 * The one formatter for money in text: `1234` USD -> `$12.34`. Used by the web app, the API
 * notification texts and the worker. Falls back to `12.34 XXX` for an unknown currency code.
 */
export function formatMoney(
  amountMinor: number,
  currencyCode: string,
  options: FormatMoneyOptions = {},
): string {
  const locale = options.locale ?? "en-US";
  try {
    const probe = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode });
    const precision = options.precision ?? probe.resolvedOptions().maximumFractionDigits ?? 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(fromMinorUnits(amountMinor, precision));
  } catch {
    const precision = options.precision ?? 2;
    return `${fromMinorUnits(amountMinor, precision).toFixed(precision)} ${currencyCode}`;
  }
}

/** Minor units as a plain decimal string for machine output (CSV, JSON): `1234` -> `"12.34"`. */
export function formatDecimalAmount(amountMinor: number, precision = 2): string {
  return fromMinorUnits(amountMinor, precision).toFixed(precision);
}
