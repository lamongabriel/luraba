import { z } from "zod";
import { currencyCodeSchema, moneyAmountSchema } from "../common.js";
import { commaSeparatedArraySchema, createListQuerySchema } from "../list.js";
import { fxProviderSchema } from "./resource.js";

export const listCurrenciesQuerySchema = createListQuerySchema(
  {
    codes: commaSeparatedArraySchema(currencyCodeSchema),
    precisions: commaSeparatedArraySchema(z.coerce.number().int().min(0).max(8)),
  },
  ["code", "symbol", "precision"],
);

export const getCurrencyRateQuerySchema = z.object({
  fromCurrencyCode: currencyCodeSchema,
  toCurrencyCode: currencyCodeSchema,
  date: z.coerce.date().optional(),
  amount: moneyAmountSchema.optional(),
  provider: fxProviderSchema.optional(),
});

export type ListCurrenciesQuery = z.input<typeof listCurrenciesQuerySchema>;
export type GetCurrencyRateQuery = z.input<typeof getCurrencyRateQuerySchema>;
