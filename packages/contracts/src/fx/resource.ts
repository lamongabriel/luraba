import { z } from "zod";
import { currencyCodeSchema } from "../common.js";
import { FX_PROVIDER_IDS } from "../currencies/resource.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

/** Where a conversion rate came from: the household's manual override or a market-data provider. */
export const fxRateSourceSchema = z.enum(["manual", ...FX_PROVIDER_IDS]);

/** The rate that turns one currency into the base currency, exact (a fraction) and readable (`rate`). */
export const combinedFxRateSchema = z.object({
  /** The source currency; the target is always the base currency. */
  currencyCode: currencyCodeSchema,
  rateNumerator: z.number().int().positive(),
  rateDenominator: z.number().int().positive(),
  /** Minor-unit precision of the source currency. */
  precision: z.number().int().min(0).max(8),
  /** 1 unit of `currencyCode` in the base currency, for display only. */
  rate: z.number().positive(),
  rateDate: isoDateSchema,
  source: fxRateSourceSchema,
});

/**
 * The conversion context behind a combined total: the base currency, the rate used for each other
 * currency and the currencies that have no rate yet (their totals stay per currency).
 */
export const combinedFxSchema = z.object({
  baseCurrencyCode: currencyCodeSchema,
  basePrecision: z.number().int().min(0).max(8),
  /** The oldest date among the rates used; `null` when no conversion was needed. */
  asOf: isoDateSchema.nullable(),
  rates: z.array(combinedFxRateSchema),
  missingCurrencies: z.array(currencyCodeSchema),
});

/** One headline figure: the base-currency total (`null` when a rate is missing) and the native amounts. */
export const combinedAmountSchema = z.object({
  total: z.number().int().nullable(),
  byCurrency: z.array(z.object({ currencyCode: currencyCodeSchema, amount: z.number().int() })),
});

export const fxOverrideSchema = z.object({
  fromCurrencyCode: currencyCodeSchema,
  toCurrencyCode: currencyCodeSchema,
  /** 1 unit of the "from" currency in the "to" currency. */
  rate: z.number().positive(),
  updatedAt: isoDateSchema,
});

export type CombinedFxRate = z.output<typeof combinedFxRateSchema>;
export type CombinedFx = z.output<typeof combinedFxSchema>;
export type CombinedAmountWire = z.output<typeof combinedAmountSchema>;
export type FxOverride = z.output<typeof fxOverrideSchema>;
