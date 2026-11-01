import { formatMoney, fromMinorUnits, toMinorUnits } from "@luraba/domain";

const precisionCache = new Map<string, number>();

/** Decimal places of a currency (2 for USD, 0 for JPY), as the web app and the API format it. */
export function currencyPrecision(currencyCode: string): number {
  const code = currencyCode.toUpperCase();
  const cached = precisionCache.get(code);
  if (cached !== undefined) return cached;
  let precision = 2;
  try {
    precision =
      new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    precision = 2;
  }
  precisionCache.set(code, precision);
  return precision;
}

export type Money = {
  /** Major units, signed: `-12.5` is minus twelve dollars fifty. */
  amount: number;
  currency: string;
  formatted: string;
};

/** Minor units from the API to what an agent reads: major units plus a formatted string. */
export function toMoney(amountMinor: number, currencyCode: string): Money {
  const precision = currencyPrecision(currencyCode);
  return {
    amount: fromMinorUnits(amountMinor, precision),
    currency: currencyCode,
    formatted: formatMoney(amountMinor, currencyCode),
  };
}

/** Major units from an agent to the API's integer minor units. */
export function majorToMinor(amountMajor: number, currencyCode: string): number {
  return toMinorUnits(amountMajor, currencyPrecision(currencyCode));
}

/** Major units (what an agent typed, `130` = R$130.00) to the same display shape as `toMoney`. */
export function majorToMoney(amountMajor: number, currencyCode: string): Money {
  return toMoney(majorToMinor(amountMajor, currencyCode), currencyCode);
}
