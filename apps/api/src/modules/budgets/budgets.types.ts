import { z } from 'zod';
import type { budgetsTable } from '@/db/schemas/budgets.schema';
import { formatMonthKey, parseMonthKey } from '@/shared/lib/date';
import { moneyAmountSchema } from '@/shared/validation/money';

export type BudgetRecord = typeof budgetsTable.$inferSelect;

const BudgetMonthKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Month must use YYYY-MM format')
  .refine((value) => {
    const [year, month] = value.split('-').map(Number);
    return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
  }, 'Month must be a valid year-month');

const BudgetCurrencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const ReplaceMonthlyBudgetAllocationSchema = z.object({
  categoryId: z.uuid(),
  amount: moneyAmountSchema,
});

const MonthlyBudgetCategoryBreakdownSchema = z.object({
  categoryId: z.uuid(),
  categoryName: z.string(),
  parentId: z.uuid().nullable(),
  budgetedAmount: z.number().int(),
  actualAmount: z.number().int(),
});

const MonthlyBudgetTotalsSchema = z.object({
  incomeBudgeted: z.number().int(),
  incomeActual: z.number().int(),
  expenseBudgeted: z.number().int(),
  expenseActual: z.number().int(),
});

const MonthlyBudgetSchema = z.object({
  month: BudgetMonthKeySchema,
  budgetCurrencyCode: BudgetCurrencyCodeSchema,
  displayCurrencyCode: BudgetCurrencyCodeSchema,
  totals: MonthlyBudgetTotalsSchema,
  categories: z.object({
    income: z.array(MonthlyBudgetCategoryBreakdownSchema),
    expense: z.array(MonthlyBudgetCategoryBreakdownSchema),
  }),
});

export const GetMonthlyBudgetRequestParamsSchema = z.object({
  month: BudgetMonthKeySchema,
});

export const GetMonthlyBudgetRequestQuerySchema = z.object({
  displayCurrencyCode: BudgetCurrencyCodeSchema.optional(),
});

export const GetMonthlyBudgetResponseSchema = MonthlyBudgetSchema;

export const ReplaceMonthlyBudgetRequestParamsSchema = z.object({
  month: BudgetMonthKeySchema,
});

export const ReplaceMonthlyBudgetRequestBodySchema = z.object({
  income: z.array(ReplaceMonthlyBudgetAllocationSchema).default([]),
  expense: z.array(ReplaceMonthlyBudgetAllocationSchema).default([]),
});

export const ReplaceMonthlyBudgetResponseSchema = MonthlyBudgetSchema;

export type MonthlyBudget = z.infer<typeof MonthlyBudgetSchema>;
export type GetMonthlyBudgetRequestParams = z.infer<typeof GetMonthlyBudgetRequestParamsSchema>;
export type GetMonthlyBudgetRequestQuery = z.infer<typeof GetMonthlyBudgetRequestQuerySchema>;
export type GetMonthlyBudgetResponse = z.infer<typeof GetMonthlyBudgetResponseSchema>;
export type ReplaceMonthlyBudgetRequestParams = z.infer<
  typeof ReplaceMonthlyBudgetRequestParamsSchema
>;
export type ReplaceMonthlyBudgetRequestBody = z.infer<typeof ReplaceMonthlyBudgetRequestBodySchema>;
export type ReplaceMonthlyBudgetResponse = z.infer<typeof ReplaceMonthlyBudgetResponseSchema>;

export { formatMonthKey as formatBudgetMonthKey, parseMonthKey as parseBudgetMonthKey };
