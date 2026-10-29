import { formatMoney, fromMinorUnits, toMinorUnits } from "@luraba/domain";

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  "pt-BR": "pt-BR",
};

export function getLocale(language = "en") {
  return LANGUAGE_TO_LOCALE[language] ?? "en-US";
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  language = "en",
  options?: Intl.NumberFormatOptions,
  precision = 2,
) {
  if (options) {
    return new Intl.NumberFormat(getLocale(language), {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
      ...options,
    }).format(minorToMajorUnits(amount, precision));
  }
  return formatMoney(amount, currencyCode, { locale: getLocale(language), precision });
}

/** A plain localized number (counts, areas, mileage). Money goes through `formatCurrency`. */
export function formatNumber(value: number, language = "en", options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/** Fallback when neither the record nor the household names a currency. */
export const FALLBACK_CURRENCY_CODE = "USD";

export function majorToMinorUnits(amount: number, precision: number) {
  return toMinorUnits(amount, precision);
}

export function minorToMajorUnits(amount: number, precision: number) {
  return fromMinorUnits(amount, precision);
}

export function formatSignedCurrency(
  amount: number,
  currencyCode: string,
  language = "en",
  precision = 2,
) {
  return `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${formatCurrency(Math.abs(amount), currencyCode, language, undefined, precision)}`;
}

export function maskCardNumber(last4: string) {
  return `•••• •••• •••• ${last4}`;
}

export function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + item.amount, 0);
}
