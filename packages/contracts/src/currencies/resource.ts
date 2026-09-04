import { z } from "zod";
import { currencyCodeSchema } from "../common.js";

export const FX_PROVIDER_IDS = ["frankfurter", "yahoo-finance2"] as const;
export const fxProviderSchema = z.enum(FX_PROVIDER_IDS);
export const currencySchema = z.object({
  code: currencyCodeSchema,
  symbol: z.string(),
  precision: z.number().int().min(0).max(8),
});
export const currencyRateSchema = z.object({
  fromCurrency: currencySchema,
  toCurrency: currencySchema,
  provider: fxProviderSchema,
  rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format"),
  rate: z.number(),
  amount: z.number().int().optional(),
  convertedAmount: z.number().int().optional(),
});
export type Currency = z.output<typeof currencySchema>;
export type CurrencyRate = z.output<typeof currencyRateSchema>;
export type FxProvider = CurrencyRate["provider"];
