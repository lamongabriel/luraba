import { describe, expect, it } from "vitest";
import {
  DATE_FORMAT_VALUES,
  LANGUAGE_VALUES,
  PREFERRED_PERIOD_VALUES,
  PREFERRED_THEME_VALUES,
} from "../../preferences.js";

import {
  COUNTRY_CODES,
  COUNTRY_OPTIONS,
  CURRENCY_CATALOG,
  CURRENCY_CODES,
  currencyLabel,
  DATE_FORMAT_CATALOG,
  flagEmoji,
  isCountryCode,
  isTimezone,
  LANGUAGE_CATALOG,
  labelFor,
  PREFERRED_PERIOD_CATALOG,
  PREFERRED_THEME_CATALOG,
  resolveCurrency,
  TIMEZONE_VALUES,
} from "../index.js";

/** Currencies seeded by apps/api migration 0031_reference_data.sql. */
const SEEDED_CURRENCIES = [
  "USD",
  "EUR",
  "BRL",
  "JPY",
  "GBP",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "INR",
  "MXN",
  "ZAR",
  "RUB",
  "KRW",
  "TRY",
  "SEK",
  "SGD",
  "HKD",
  "PLN",
];

describe("currency catalog", () => {
  it("covers every currency the database seeds", () => {
    for (const code of SEEDED_CURRENCIES) expect(CURRENCY_CATALOG[code]).toBeDefined();
  });

  it("gives every currency a code, name, symbol, flag and decimals", () => {
    for (const [code, meta] of Object.entries(CURRENCY_CATALOG)) {
      expect(code).toMatch(/^[A-Z]{3}$/u);
      expect(meta.name.trim()).not.toBe("");
      expect(meta.symbol.trim()).not.toBe("");
      expect(flagEmoji(meta.countryCode)).not.toBe("");
      expect(meta.decimals).toBeGreaterThanOrEqual(0);
      expect(meta.decimals).toBeLessThanOrEqual(8);
      expect(meta.name[0]).toBe(meta.name[0]?.toUpperCase());
    }
  });

  it("resolves a currency, preferring the API symbol and precision", () => {
    const brl = resolveCurrency("BRL");
    expect(brl).toMatchObject({ code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "🇧🇷" });
    expect(resolveCurrency("USD").symbol).toBe("$");
    expect(resolveCurrency("JPY", { symbol: "JP¥", precision: 0 })).toMatchObject({
      symbol: "JP¥",
      precision: 0,
    });
    expect(currencyLabel(brl)).toBe("BRL (R$)");
  });

  it("degrades gracefully for an unknown code", () => {
    expect(resolveCurrency("XYZ")).toMatchObject({ name: "XYZ", symbol: "XYZ", flag: "" });
  });
});

describe("flagEmoji", () => {
  it("builds flags from ISO codes and ignores bad input", () => {
    expect(flagEmoji("us")).toBe("🇺🇸");
    expect(flagEmoji("EU")).toBe("🇪🇺");
    expect(flagEmoji("")).toBe("");
    expect(flagEmoji("USA")).toBe("");
    expect(flagEmoji(null)).toBe("");
  });
});

describe("preference catalogs", () => {
  it("label every contract value, capitalized and unique", () => {
    const sets: Array<[readonly string[], Record<string, { label: string }>]> = [
      [LANGUAGE_VALUES, LANGUAGE_CATALOG],
      [DATE_FORMAT_VALUES, DATE_FORMAT_CATALOG],
      [PREFERRED_PERIOD_VALUES, PREFERRED_PERIOD_CATALOG],
      [PREFERRED_THEME_VALUES, PREFERRED_THEME_CATALOG],
    ];
    for (const [values, catalog] of sets) {
      expect(Object.keys(catalog).sort()).toEqual([...values].sort());
      const labels = values.map((value) => catalog[value]?.label ?? "");
      for (const label of labels) expect(label[0]).toBe(label[0]?.toUpperCase());
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("labelFor falls back to the raw value", () => {
    expect(labelFor(PREFERRED_PERIOD_CATALOG, "current_month")).toBe("This month");
    expect(labelFor(PREFERRED_PERIOD_CATALOG, "mystery")).toBe("mystery");
  });
});

describe("location catalogs", () => {
  it("has unique ISO country codes with names and flags", () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    for (const country of COUNTRY_OPTIONS) {
      expect(country.code).toMatch(/^[A-Z]{2}$/u);
      expect(country.name.trim()).not.toBe("");
      expect(country.emoji).toBe(flagEmoji(country.code));
    }
    expect(isCountryCode("BR")).toBe(true);
    expect(isCountryCode("ZZZ")).toBe(false);
  });

  it("has unique time zones", () => {
    expect(new Set(TIMEZONE_VALUES).size).toBe(TIMEZONE_VALUES.length);
    expect(isTimezone("America/New_York")).toBe(true);
    expect(isTimezone("Mars/Base")).toBe(false);
  });

  it("exposes currency codes as an enum source", () => {
    expect(CURRENCY_CODES).toEqual(expect.arrayContaining(["USD", "BRL", "EUR"]));
    expect(new Set(CURRENCY_CODES).size).toBe(CURRENCY_CODES.length);
  });
});
