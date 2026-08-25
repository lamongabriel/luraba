import { z } from 'zod';
import { FX_PROVIDER_IDS } from '@/config/fx';
import { moneyAmountSchema } from '@/shared/validation/money';
import { currencySchema } from '@/shared/validation/preferences';

export const fxProviderSchema = z.enum(FX_PROVIDER_IDS);
const fxDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format');

export const currencySummarySchema = z.object({
  code: currencySchema,
  symbol: z.string(),
  precision: z.number().int().min(0).max(8),
});

export const ListCurrenciesResponseSchema = z.array(currencySummarySchema);

export const GetCurrencyRateRequestQuerySchema = z.object({
  fromCurrencyCode: currencySchema,
  toCurrencyCode: currencySchema,
  date: z.coerce.date().optional(),
  amount: moneyAmountSchema.optional(),
  provider: fxProviderSchema.optional(),
});

export const GetCurrencyRateResponseSchema = z.object({
  fromCurrency: currencySummarySchema,
  toCurrency: currencySummarySchema,
  provider: fxProviderSchema,
  rateDate: fxDateSchema,
  rate: z.number(),
  amount: z.number().int().optional(),
  convertedAmount: z.number().int().optional(),
});

export type Currency = z.infer<typeof currencySummarySchema>;
export type ListCurrenciesResponse = z.infer<typeof ListCurrenciesResponseSchema>;
export type GetCurrencyRateRequestQuery = z.infer<typeof GetCurrencyRateRequestQuerySchema>;
export type GetCurrencyRateResponse = z.infer<typeof GetCurrencyRateResponseSchema>;
