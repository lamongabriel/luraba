"use client"

import { useQuery } from "@tanstack/react-query"

import type { AppQueryOptions } from "@/queries/query-options"
import { getMonthlyBudget } from "@/services/budgets.service"

type GetMonthlyBudgetQuery = NonNullable<Parameters<typeof getMonthlyBudget>[1]>
type GetMonthlyBudgetResponse = Awaited<ReturnType<typeof getMonthlyBudget>>

export const budgetQueryKeys = {
  all: ["budgets"] as const,
  months: () => [...budgetQueryKeys.all, "month"] as const,
  month: (month: string, query: GetMonthlyBudgetQuery = {}) =>
    [...budgetQueryKeys.months(), month, query] as const,
}

export function useMonthlyBudgetQuery<TData = GetMonthlyBudgetResponse>(
  month: string,
  query: GetMonthlyBudgetQuery = {},
  options?: AppQueryOptions<GetMonthlyBudgetResponse, TData>,
) {
  return useQuery({
    queryKey: budgetQueryKeys.month(month, query),
    queryFn: () => getMonthlyBudget(month, query),
    ...options,
    enabled: Boolean(month) && (options?.enabled ?? true),
  })
}
