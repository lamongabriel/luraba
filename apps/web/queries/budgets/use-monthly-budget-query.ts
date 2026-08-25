"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  GetMonthlyBudgetHttpQuery,
  GetMonthlyBudgetHttpResponse,
} from "@/interfaces/http/budgets-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { getMonthlyBudget } from "@/services/budgets.service"

export const budgetQueryKeys = {
  all: ["budgets"] as const,
  months: () => [...budgetQueryKeys.all, "month"] as const,
  month: (month: string, query: GetMonthlyBudgetHttpQuery = {}) =>
    [...budgetQueryKeys.months(), month, query] as const,
}

export function useMonthlyBudgetQuery<TData = GetMonthlyBudgetHttpResponse>(
  month: string,
  query: GetMonthlyBudgetHttpQuery = {},
  options?: AppQueryOptions<GetMonthlyBudgetHttpResponse, TData>,
) {
  return useQuery({
    queryKey: budgetQueryKeys.month(month, query),
    queryFn: () => getMonthlyBudget(month, query),
    ...options,
    enabled: Boolean(month) && (options?.enabled ?? true),
  })
}
