"use client";

import type { MonthlyBudget } from "@luraba/contracts";
import { useQueryClient } from "@tanstack/react-query";

import { withCategoryBudget } from "@/lib/budgets";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { budgetQueryKeys } from "@/queries/budgets/use-budgets-queries";
import * as api from "@/services/budgets.service";

/** Card settings re-stamp purchases, so every budget month is refreshed after a change. */
function createBudgetMutation<TData, TVariables>(
  name: string,
  errorMessage: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const definition = createAppMutationDefinition<TData, TVariables>({
    defaultErrorMessage: errorMessage,
    mutationFn,
    mutationKey: ["budgets", name],
  });

  return function useBudgetMutation(options?: UseAppMutationOptions<TData, TVariables>) {
    const queryClient = useQueryClient();
    return useAppMutation(definition, {
      ...options,
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: budgetQueryKeys.all });
        await options?.onSuccess?.(...args);
      },
    });
  };
}

export const useReplaceMonthlyBudgetMutation = createBudgetMutation(
  "replace",
  "We couldn't save this budget. Please try again.",
  ({ month, body }: { month: string; body: Parameters<typeof api.replaceMonthlyBudget>[1] }) =>
    api.replaceMonthlyBudget(month, body),
);

export const useUpdateBudgetMonthSettingsMutation = createBudgetMutation(
  "update-settings",
  "We couldn't update the card settings for this month. Please try again.",
  ({ month, body }: { month: string; body: Parameters<typeof api.updateBudgetMonthSettings>[1] }) =>
    api.updateBudgetMonthSettings(month, body),
);

const setCategoryBudgetDefinition = createAppMutationDefinition<
  Awaited<ReturnType<typeof api.replaceMonthlyBudget>>,
  {
    month: string;
    categoryId: string;
    /** Minor units; 0 removes the budget. */
    amount: number;
    body: Parameters<typeof api.replaceMonthlyBudget>[1];
  }
>({
  defaultErrorMessage: "We couldn't save this budget. Please try again.",
  mutationFn: ({ month, body }) => api.replaceMonthlyBudget(month, body),
  mutationKey: ["budgets", "set-category"],
});

/**
 * Changes one category's limit in place: the month in the cache updates at once, rolls back with an
 * error toast if the API refuses, and is refetched either way.
 */
export function useSetCategoryBudgetMutation() {
  const queryClient = useQueryClient();
  return useAppMutation(setCategoryBudgetDefinition, {
    errorToast: { title: ({ appError }) => appError.message },
    onMutate: async ({ month, categoryId, amount }) => {
      const key = budgetQueryKeys.month(month);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MonthlyBudget>(key);
      if (previous) queryClient.setQueryData(key, withCategoryBudget(previous, categoryId, amount));
      return { key, previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: budgetQueryKeys.all }),
  });
}
