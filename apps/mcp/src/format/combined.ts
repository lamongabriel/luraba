import type { CombinedAmountWire, CombinedFx } from "@luraba/contracts";
import { combineMinorUnits } from "@luraba/domain";
import { type Money, toMoney } from "./money.js";

export type CombinedMoney = {
  /** In the household base currency, converted at the rates in `fx`; null when a rate is missing. */
  total: Money | null;
  /** The native amounts that were added up. */
  byCurrency: Money[];
};

/** A combined headline figure the way an agent reads it. */
export function presentCombined(amount: CombinedAmountWire, fx: CombinedFx): CombinedMoney {
  return {
    total: amount.total === null ? null : toMoney(amount.total, fx.baseCurrencyCode),
    byCurrency: amount.byCurrency.map((item) => toMoney(item.amount, item.currencyCode)),
  };
}

/** The rates behind every combined figure of a report, with the honest caveat. */
export function presentFx(fx: CombinedFx) {
  return {
    baseCurrency: fx.baseCurrencyCode,
    asOf: fx.asOf,
    ratesUsed: fx.rates.map((rate) => ({
      from: rate.currencyCode,
      to: fx.baseCurrencyCode,
      rate: rate.rate,
      date: rate.rateDate,
      source: rate.source,
    })),
    missingRates: fx.missingCurrencies,
    note:
      fx.missingCurrencies.length > 0
        ? `No exchange rate for ${fx.missingCurrencies.join(", ")}: combined totals that include it are null; use the per-currency amounts.`
        : fx.rates.length > 0
          ? `Combined totals are approximate: each currency converted to ${fx.baseCurrencyCode} at the latest rate, rounded once.`
          : `Everything is in ${fx.baseCurrencyCode}; no conversion needed.`,
  };
}

/** Combines native amounts with the report's rates (same maths and rounding as the API). */
export function combineWith(fx: CombinedFx, byCurrency: Record<string, number>): CombinedMoney {
  return presentCombined(combineMinorUnits(byCurrency, fx), fx);
}
