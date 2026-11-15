import { describe, expect, it } from "vitest";
import {
  combineMinorUnits,
  convertMinorUnitsWithRate,
  fractionToFxRate,
  isMixedCurrencies,
  normalizeFxRate,
} from "../fx.js";

const fx = {
  baseCurrencyCode: "USD",
  basePrecision: 2,
  rates: [{ currencyCode: "BRL", rateNumerator: 1, rateDenominator: 5, precision: 2 }],
};

describe("combineMinorUnits", () => {
  it("adds the base currency as is and converts the other", () => {
    // $100.00 + R$50.00 at 0.20 = $110.00
    expect(combineMinorUnits({ USD: 10_000, BRL: 5_000 }, fx).total).toBe(11_000);
  });

  it("rounds once at the end, not per currency", () => {
    const thirds = {
      baseCurrencyCode: "USD",
      basePrecision: 2,
      rates: [
        { currencyCode: "BRL", rateNumerator: 1, rateDenominator: 3, precision: 2 },
        { currencyCode: "EUR", rateNumerator: 1, rateDenominator: 3, precision: 2 },
      ],
    };
    // 0.5 cents + 0.5 cents (exactly 1.0 after summing): per-currency rounding would give 2 or 0.
    // R$0.05 = 1.666.. cents; EUR 0.04 = 1.333.. cents; exact sum 3.0 cents.
    expect(combineMinorUnits({ BRL: 5, EUR: 4 }, thirds).total).toBe(3);
  });

  it("rounds half away from zero for negatives", () => {
    const half = {
      baseCurrencyCode: "USD",
      basePrecision: 2,
      rates: [{ currencyCode: "BRL", rateNumerator: 1, rateDenominator: 2, precision: 2 }],
    };
    expect(combineMinorUnits({ BRL: 3 }, half).total).toBe(2);
    expect(combineMinorUnits({ BRL: -3 }, half).total).toBe(-2);
  });

  it("handles currencies with different precisions", () => {
    const jpy = {
      baseCurrencyCode: "USD",
      basePrecision: 2,
      rates: [{ currencyCode: "JPY", rateNumerator: 1, rateDenominator: 150, precision: 0 }],
    };
    // ¥1,500 at 1/150 = $10.00
    expect(combineMinorUnits({ JPY: 1_500 }, jpy).total).toBe(1_000);
  });

  it("returns a null total, keeping the native amounts, when a rate is missing", () => {
    const result = combineMinorUnits({ USD: 100, EUR: 200 }, fx);
    expect(result.total).toBeNull();
    expect(result.byCurrency).toEqual([
      { currencyCode: "EUR", amount: 200 },
      { currencyCode: "USD", amount: 100 },
    ]);
  });

  it("ignores a missing rate for a zero amount", () => {
    expect(combineMinorUnits({ USD: 100, EUR: 0 }, fx).total).toBe(100);
  });

  it("works when the base currency has no amounts and when nothing is given", () => {
    expect(combineMinorUnits({ BRL: 10_000 }, fx).total).toBe(2_000);
    expect(combineMinorUnits({}, fx).total).toBe(0);
  });
});

describe("isMixedCurrencies", () => {
  it("is true only when a non-base currency has a value", () => {
    expect(isMixedCurrencies({ USD: 1 }, "USD")).toBe(false);
    expect(isMixedCurrencies({ USD: 1, BRL: 0 }, "USD")).toBe(false);
    expect(isMixedCurrencies({ USD: 1, BRL: 2 }, "USD")).toBe(true);
  });
});

describe("exact decimal rates", () => {
  it("keeps every digit of a rate and never goes through a 2-decimal rate", () => {
    expect(normalizeFxRate("0.18077")).toBe("0.18077");
    expect(normalizeFxRate(0.18077)).toBe("0.18077");
    expect(normalizeFxRate(1e-7)).toBe("0.0000001");
    expect(normalizeFxRate("5.5311000")).toBe("5.5311");
    expect(normalizeFxRate("0.123456789012345")).toBe("0.12345678901235");
    expect(() => normalizeFxRate("-1")).toThrow();
    expect(() => normalizeFxRate("0")).toThrow();
  });

  it("turns a fraction into a decimal rate, half up", () => {
    expect(fractionToFxRate(10_000, 55_311)).toBe("0.18079586339065");
    expect(fractionToFxRate(1, 3)).toBe("0.33333333333333");
    expect(fractionToFxRate(2, 3)).toBe("0.66666666666667");
    expect(fractionToFxRate(56_354, 10_000)).toBe("5.6354");
  });

  it("rounds only the converted amount: R$5,495.41 at the exact rate, not at 0.18", () => {
    const exact = convertMinorUnitsWithRate(549_541, "0.17744", 2, 2);
    expect(exact).toBe(97_511);
    // The reported bug: the rate was rounded to 2 decimals first.
    expect(convertMinorUnitsWithRate(549_541, "0.18", 2, 2)).toBe(98_917);
    expect(convertMinorUnitsWithRate(549_541, "0.17744", 2, 2)).not.toBe(98_917);
  });

  it("rounds half up to the target minor unit and handles other precisions", () => {
    expect(convertMinorUnitsWithRate(1, "0.5", 2, 2)).toBe(1); // 0.5 cent -> 1
    expect(convertMinorUnitsWithRate(1, "0.4999", 2, 2)).toBe(0);
    expect(convertMinorUnitsWithRate(10_000, "150.5", 2, 0)).toBe(15_050); // USD -> JPY
    expect(convertMinorUnitsWithRate(150_000, "0.0066", 0, 2)).toBe(99_000); // JPY -> USD
    expect(convertMinorUnitsWithRate(-1000, "0.18077", 2, 2)).toBe(-181);
  });
});
