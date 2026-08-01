export interface MonthlyBudgetCategoryBreakdown {
  categoryId: string
  categoryName: string
  parentId: string | null
  budgetedAmount: number
  actualAmount: number
}

export interface MonthlyBudgetTotals {
  incomeBudgeted: number
  incomeActual: number
  expenseBudgeted: number
  expenseActual: number
}

export interface MonthlyBudget {
  month: string
  budgetCurrencyCode: string
  displayCurrencyCode: string
  totals: MonthlyBudgetTotals
  categories: {
    income: MonthlyBudgetCategoryBreakdown[]
    expense: MonthlyBudgetCategoryBreakdown[]
  }
}

export interface MonthlyBudgetAllocation {
  categoryId: string
  amount: number
}
