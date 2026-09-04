import { z } from "zod";
import { currencyCodeSchema, moneyAmountSchema } from "../common.js";
import { budgetMonthKeySchema } from "./resource.js";

export const budgetMonthParamsSchema = z.object({ month: budgetMonthKeySchema });

export const getMonthlyBudgetQuerySchema = z.object({
  displayCurrencyCode: currencyCodeSchema.optional(),
});

export const replaceMonthlyBudgetBodySchema = z.object({
  income: z.array(z.object({ categoryId: z.uuid(), amount: moneyAmountSchema })).default([]),
  expense: z.array(z.object({ categoryId: z.uuid(), amount: moneyAmountSchema })).default([]),
});

export type GetMonthlyBudgetQuery = z.input<typeof getMonthlyBudgetQuerySchema>;
export type ReplaceMonthlyBudgetInput = z.input<typeof replaceMonthlyBudgetBodySchema>;
