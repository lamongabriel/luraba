"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { getMonthlyBudget } from "@/services/budgets.service";

type MonthlyBudgetResponse = Awaited<ReturnType<typeof getMonthlyBudget>>;

export const budgetQueryKeys = {
  all: ["budgets"] as const,
  month: (month: string) => [...budgetQueryKeys.all, "month", month] as const,
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
