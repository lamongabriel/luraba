"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { getBudgetInsights, getMonthlyBudget } from "@/services/budgets.service";

type MonthlyBudgetResponse = Awaited<ReturnType<typeof getMonthlyBudget>>;

export const budgetQueryKeys = {
  all: ["budgets"] as const,
  month: (month: string) => [...budgetQueryKeys.all, "month", month] as const,
  insights: (month: string) => [...budgetQueryKeys.all, "insights", month] as const,
};

export function useMonthlyBudgetQuery<TData = MonthlyBudgetResponse>(
  month: string,
  options?: AppQueryOptions<MonthlyBudgetResponse, TData>,
) {
  return useQuery({
    queryKey: budgetQueryKeys.month(month),
    queryFn: () => getMonthlyBudget(month),
    ...options,
  });
}

/** History and most expenses of a month; loaded apart so the page never waits for them. */
export function useBudgetInsightsQuery(month: string) {
  return useQuery({
    queryKey: budgetQueryKeys.insights(month),
    queryFn: () => getBudgetInsights(month),
  });
}
