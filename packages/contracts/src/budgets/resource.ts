import { z } from "zod";
import { currencyCodeSchema } from "../common.js";

export const budgetMonthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must use YYYY-MM format")
  .refine((value) => {
    const [year, month] = value.split("-").map(Number);
    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
  }, "Month must be a valid year-month");
export const monthlyBudgetSchema = z.object({
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
