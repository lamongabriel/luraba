"use client";

import { useQuery } from "@tanstack/react-query";

import { goalQueryKeys } from "@/queries/goals/use-goals-queries";
import { getSafeToSpend } from "@/services/monthly-plans.service";

/**
 * Nested under the goals key, so every goal mutation (contribution, plan change) refreshes it too;
 * the budgets, bills and transactions mutations invalidate it where they touch the maths.
 */
export const safeToSpendQueryKeys = {
  all: [...goalQueryKeys.all, "safe-to-spend"] as const,
  month: (month: string) => [...safeToSpendQueryKeys.all, month] as const,
};

export function useSafeToSpendQuery(month: string) {
  return useQuery({
    queryKey: safeToSpendQueryKeys.month(month),
    queryFn: () => getSafeToSpend(month),
    // Bills, invoices and transactions change elsewhere; always recompute when the page opens.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
