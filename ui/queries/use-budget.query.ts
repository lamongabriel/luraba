"use client";

import { useQuery } from "@tanstack/react-query";
import { getBudget } from "@/services/budgets.service";

export const useBudgetQuery = (month: string, currencyCode?: string) => {
  return useQuery({
    queryKey: ["budgets", month, currencyCode ?? "default"],
    queryFn: () => getBudget(month, currencyCode),
    enabled: Boolean(month),
  });
};
