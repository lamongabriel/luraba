"use client";

import { useQueryClient } from "@tanstack/react-query";

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
