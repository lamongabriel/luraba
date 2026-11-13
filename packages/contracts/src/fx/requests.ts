import { z } from "zod";
import { currencyCodeSchema } from "../common.js";
import { commaSeparatedArraySchema } from "../list.js";

export const combinedFxQuerySchema = z.object({
  /** The currencies that need a rate to the base currency (the base itself is ignored). */
  currencies: commaSeparatedArraySchema(currencyCodeSchema),
});

export const setFxOverrideBodySchema = z
  .object({
    fromCurrencyCode: currencyCodeSchema,
    toCurrencyCode: currencyCodeSchema,
    rate: z.number().positive().max(1_000_000_000),
  })
  .refine((value) => value.fromCurrencyCode !== value.toCurrencyCode, {
    message: "Choose two different currencies.",
    path: ["toCurrencyCode"],
  });

export const fxOverrideParamsSchema = z.object({
  fromCurrencyCode: currencyCodeSchema,
  toCurrencyCode: currencyCodeSchema,
});

export type SetFxOverrideBody = z.input<typeof setFxOverrideBodySchema>;
