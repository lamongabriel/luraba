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

/**
 * What the Budgets page needs beyond one month: how the last months went against their budget and
 * where the money goes this month compared with the month before. Expenses only, display currency.
 */
export const budgetInsightsSchema = z.object({
  month: budgetMonthKeySchema,
  budgetCurrencyCode: currencyCodeSchema,
  displayCurrencyCode: currencyCodeSchema,
  /** Oldest first, ending with `month`. */
  history: z.array(
    z.object({
      month: budgetMonthKeySchema,
      budgetedAmount: z.number().int(),
      spentAmount: z.number().int(),
    }),
  ),
  /** Every category with spending in `month`, biggest first (the page ranks them and shows the change on each row). */
  mostExpenses: z.array(
    z.object({
      categoryId: z.uuid(),
      categoryName: z.string(),
      parentId: z.uuid().nullable(),
      actualAmount: z.number().int(),
      previousAmount: z.number().int(),
      /** Percent versus the previous month; `null` when the previous month had no spending. */
      changePercent: z.number().nullable(),
    }),
  ),
});
export type BudgetInsights = z.output<typeof budgetInsightsSchema>;
