import type {
  MonthlyBudget,
  MonthlyBudgetAllocation,
} from "@/interfaces/budget"

export interface GetMonthlyBudgetHttpQuery {
  displayCurrencyCode?: string
}

export type GetMonthlyBudgetHttpResponse = MonthlyBudget
export interface ReplaceMonthlyBudgetHttpBody {
  income?: MonthlyBudgetAllocation[]
  expense?: MonthlyBudgetAllocation[]
}
export type ReplaceMonthlyBudgetHttpResponse = MonthlyBudget
