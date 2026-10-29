import { z } from "zod";
import { currencyCodeSchema, moneyAmountSchema } from "../common.js";
import { creditExpenseTimingSchema, creditInstallmentBudgetModeSchema } from "../preferences.js";
import { budgetMonthKeySchema } from "./resource.js";

export const budgetMonthParamsSchema = z.object({ month: budgetMonthKeySchema });

export const getMonthlyBudgetQuerySchema = z.object({
  displayCurrencyCode: currencyCodeSchema.optional(),
});

export const replaceMonthlyBudgetBodySchema = z.object({
  income: z.array(z.object({ categoryId: z.uuid(), amount: moneyAmountSchema })).default([]),
  expense: z.array(z.object({ categoryId: z.uuid(), amount: moneyAmountSchema })).default([]),
});

/** `null` clears the override so the month follows the household default again. */
export const updateBudgetMonthSettingsBodySchema = z.object({
  creditExpenseTiming: creditExpenseTimingSchema.nullable(),
  creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema.nullable(),
});

export type UpdateBudgetMonthSettingsInput = z.input<typeof updateBudgetMonthSettingsBodySchema>;
export type GetMonthlyBudgetQuery = z.input<typeof getMonthlyBudgetQuerySchema>;
export type ReplaceMonthlyBudgetInput = z.input<typeof replaceMonthlyBudgetBodySchema>;
