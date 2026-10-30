import type { Currency } from "../currencies/resource.js";

import { flagEmoji } from "./flags.js";

/**
 * Presentation data for currencies. The database (`/currencies`) decides WHICH currencies exist and
 * owns their symbol and precision; this catalog adds the parts it does not store: the name and the
 * country whose flag represents the currency. Add a row here when you add a currency to the database.
 */
export interface CurrencyMeta {
  /** English name, title-cased. */
  name: string;
  /** ISO 3166-1 alpha-2 code of the flag shown with the currency (`EU` for the euro). */
  countryCode: string;
  /** Local symbol, used until the API answers or when it has no row. */
  symbol: string;
  /** Minor-unit digits, used until the API answers or when it has no row. */
  decimals: number;
}

export const CURRENCY_CATALOG: Readonly<Record<string, CurrencyMeta>> = {
  USD: { name: "US Dollar", countryCode: "US", symbol: "$", decimals: 2 },
  EUR: { name: "Euro", countryCode: "EU", symbol: "€", decimals: 2 },
  BRL: { name: "Brazilian Real", countryCode: "BR", symbol: "R$", decimals: 2 },
  JPY: { name: "Japanese Yen", countryCode: "JP", symbol: "¥", decimals: 0 },
  GBP: { name: "British Pound", countryCode: "GB", symbol: "£", decimals: 2 },
  AUD: { name: "Australian Dollar", countryCode: "AU", symbol: "A$", decimals: 2 },
  CAD: { name: "Canadian Dollar", countryCode: "CA", symbol: "C$", decimals: 2 },
  CHF: { name: "Swiss Franc", countryCode: "CH", symbol: "Fr", decimals: 2 },
  CNY: { name: "Chinese Yuan", countryCode: "CN", symbol: "¥", decimals: 2 },
  INR: { name: "Indian Rupee", countryCode: "IN", symbol: "₹", decimals: 2 },
  MXN: { name: "Mexican Peso", countryCode: "MX", symbol: "$", decimals: 2 },
  ZAR: { name: "South African Rand", countryCode: "ZA", symbol: "R", decimals: 2 },
  RUB: { name: "Russian Ruble", countryCode: "RU", symbol: "₽", decimals: 2 },
  KRW: { name: "South Korean Won", countryCode: "KR", symbol: "₩", decimals: 0 },
  TRY: { name: "Turkish Lira", countryCode: "TR", symbol: "₺", decimals: 2 },
  SEK: { name: "Swedish Krona", countryCode: "SE", symbol: "kr", decimals: 2 },
  SGD: { name: "Singapore Dollar", countryCode: "SG", symbol: "S$", decimals: 2 },
  HKD: { name: "Hong Kong Dollar", countryCode: "HK", symbol: "HK$", decimals: 2 },
  PLN: { name: "Polish Zloty", countryCode: "PL", symbol: "zł", decimals: 2 },
  NZD: { name: "New Zealand Dollar", countryCode: "NZ", symbol: "NZ$", decimals: 2 },
  NOK: { name: "Norwegian Krone", countryCode: "NO", symbol: "kr", decimals: 2 },
  DKK: { name: "Danish Krone", countryCode: "DK", symbol: "kr", decimals: 2 },
  CZK: { name: "Czech Koruna", countryCode: "CZ", symbol: "Kč", decimals: 2 },
  HUF: { name: "Hungarian Forint", countryCode: "HU", symbol: "Ft", decimals: 2 },
  ARS: { name: "Argentine Peso", countryCode: "AR", symbol: "$", decimals: 2 },
  CLP: { name: "Chilean Peso", countryCode: "CL", symbol: "$", decimals: 0 },
  COP: { name: "Colombian Peso", countryCode: "CO", symbol: "$", decimals: 2 },
  PEN: { name: "Peruvian Sol", countryCode: "PE", symbol: "S/", decimals: 2 },
  UYU: { name: "Uruguayan Peso", countryCode: "UY", symbol: "$U", decimals: 2 },
  AED: { name: "UAE Dirham", countryCode: "AE", symbol: "د.إ", decimals: 2 },
  SAR: { name: "Saudi Riyal", countryCode: "SA", symbol: "﷼", decimals: 2 },
  ILS: { name: "Israeli Shekel", countryCode: "IL", symbol: "₪", decimals: 2 },
  THB: { name: "Thai Baht", countryCode: "TH", symbol: "฿", decimals: 2 },
  IDR: { name: "Indonesian Rupiah", countryCode: "ID", symbol: "Rp", decimals: 2 },
  MYR: { name: "Malaysian Ringgit", countryCode: "MY", symbol: "RM", decimals: 2 },
  PHP: { name: "Philippine Peso", countryCode: "PH", symbol: "₱", decimals: 2 },
  TWD: { name: "New Taiwan Dollar", countryCode: "TW", symbol: "NT$", decimals: 2 },
  VND: { name: "Vietnamese Dong", countryCode: "VN", symbol: "₫", decimals: 0 },
  EGP: { name: "Egyptian Pound", countryCode: "EG", symbol: "E£", decimals: 2 },
  NGN: { name: "Nigerian Naira", countryCode: "NG", symbol: "₦", decimals: 2 },
  UAH: { name: "Ukrainian Hryvnia", countryCode: "UA", symbol: "₴", decimals: 2 },
};

/** Every currency code the app has presentation data for, as an enum for schemas and selects. */
export const CURRENCY_CODES = Object.keys(CURRENCY_CATALOG) as [string, ...string[]];

/** Everything the UI needs to show or choose one currency. */
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  precision: number;
  countryCode: string | null;
  /** Flag emoji, "" when the currency has no country (an unknown code). */
  flag: string;
}

/**
 * Merges the API row (symbol and precision are authoritative) with the catalog (name and flag).
 * Works for unknown codes too: the code is the name, the symbol is the code, no flag.
 */
export function resolveCurrency(
  code: string,
  apiCurrency?: Pick<Currency, "symbol" | "precision"> | null,
): CurrencyInfo {
  const meta = CURRENCY_CATALOG[code];
  return {
    code,
    name: meta?.name ?? code,
    symbol: apiCurrency?.symbol ?? meta?.symbol ?? code,
    precision: apiCurrency?.precision ?? meta?.decimals ?? 2,
    countryCode: meta?.countryCode ?? null,
    flag: flagEmoji(meta?.countryCode),
  };
}

/** Plain-text label for places that cannot render the display component: `BRL (R$)`. */
export function currencyLabel(info: Pick<CurrencyInfo, "code" | "symbol">): string {
  return info.symbol && info.symbol !== info.code ? `${info.code} (${info.symbol})` : info.code;
}
