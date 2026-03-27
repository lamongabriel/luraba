import type { ApiSuccessHttp } from "@/interfaces/http/api-responses";

export interface BudgetCategoryBreakdownHttp {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  budgetedAmount: number;
  actualAmount: number;
}

export interface MonthlyBudgetHttp {
  month: string;
  currencyCode: string;
  totals: {
    incomeBudgeted: number;
    incomeActual: number;
    expenseBudgeted: number;
    expenseActual: number;
  };
  categories: {
    income: BudgetCategoryBreakdownHttp[];
    expense: BudgetCategoryBreakdownHttp[];
  };
}

export interface ReplaceBudgetHttpParams {
  currencyCode?: string;
  income: Array<{ categoryId: string; amount: number }>;
  expense: Array<{ categoryId: string; amount: number }>;
}

export type GetBudgetHttpResponse = ApiSuccessHttp<MonthlyBudgetHttp>;
export type ReplaceBudgetHttpResponse = ApiSuccessHttp<MonthlyBudgetHttp>;
