import { z } from 'zod';

export const budgetMonthParamSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must use YYYY-MM format')
    .refine((value) => {
      const [year, month] = value.split('-').map(Number);
      return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
    }, 'Month must be a valid year-month'),
});

export const currencyCodeSchema = z.string().trim().length(3).transform((value) => value.toUpperCase());

export const budgetQuerySchema = z.object({
  currencyCode: currencyCodeSchema.optional(),
});

const moneyAmountSchema = z.coerce.number().int().positive().max(2_147_483_647);

const budgetAllocationInputSchema = z.object({
  categoryId: z.string().uuid(),
  amount: moneyAmountSchema,
});

export const replaceBudgetSchema = z.object({
  currencyCode: currencyCodeSchema.optional(),
  income: z.array(budgetAllocationInputSchema).default([]),
  expense: z.array(budgetAllocationInputSchema).default([]),
});

export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
export type ReplaceBudgetDto = z.infer<typeof replaceBudgetSchema>;

export type BudgetCategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  budgetedAmount: number;
  actualAmount: number;
};

export type MonthlyBudgetResponse = {
  month: string;
  currencyCode: string;
  totals: {
    incomeBudgeted: number;
    incomeActual: number;
    expenseBudgeted: number;
    expenseActual: number;
  };
  categories: {
    income: BudgetCategoryBreakdown[];
    expense: BudgetCategoryBreakdown[];
  };
};

export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function formatMonthKey(monthDate: Date): string {
  const year = monthDate.getUTCFullYear();
  const month = String(monthDate.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
