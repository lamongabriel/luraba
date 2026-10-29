import { z } from "zod";
import { currencyCodeSchema } from "../common.js";
import { creditExpenseTimingSchema, creditInstallmentBudgetModeSchema } from "../preferences.js";

export const budgetMonthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must use YYYY-MM format")
  .refine((value) => {
    const [year, month] = value.split("-").map(Number);
    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
  }, "Month must be a valid year-month");
/**
 * How credit-card purchases count in a budget month. `override*` is set when the month departs from
 * the household default; `effective*` is what actually applies (override, else the default).
 */
export const budgetMonthSettingsSchema = z.object({
  overrideCreditExpenseTiming: creditExpenseTimingSchema.nullable(),
  overrideCreditInstallmentBudgetMode: creditInstallmentBudgetModeSchema.nullable(),
  creditExpenseTiming: creditExpenseTimingSchema,
  creditInstallmentBudgetMode: creditInstallmentBudgetModeSchema,
  defaultCreditExpenseTiming: creditExpenseTimingSchema,
  defaultCreditInstallmentBudgetMode: creditInstallmentBudgetModeSchema,
});
export type BudgetMonthSettings = z.output<typeof budgetMonthSettingsSchema>;

export const monthlyBudgetSchema = z.object({
  settings: budgetMonthSettingsSchema,
  month: budgetMonthKeySchema,
  budgetCurrencyCode: currencyCodeSchema,
  displayCurrencyCode: currencyCodeSchema,
  totals: z.object({
    incomeBudgeted: z.number().int(),
    incomeActual: z.number().int(),
    expenseBudgeted: z.number().int(),
    expenseActual: z.number().int(),
  }),
  categories: z.object({
    income: z.array(
      z.object({
        categoryId: z.uuid(),
        categoryName: z.string(),
        parentId: z.uuid().nullable(),
        budgetedAmount: z.number().int(),
        actualAmount: z.number().int(),
      }),
    ),
    expense: z.array(
      z.object({
        categoryId: z.uuid(),
        categoryName: z.string(),
        parentId: z.uuid().nullable(),
        budgetedAmount: z.number().int(),
        actualAmount: z.number().int(),
      }),
    ),
  }),
});
export type MonthlyBudget = z.output<typeof monthlyBudgetSchema>;
