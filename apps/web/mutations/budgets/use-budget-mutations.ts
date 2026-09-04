"use client"

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import { replaceMonthlyBudget } from "@/services/budgets.service"

type ReplaceMonthlyBudgetVariables = {
  month: string
  body: Parameters<typeof replaceMonthlyBudget>[1]
}
type ReplaceMonthlyBudgetResponse = Awaited<
  ReturnType<typeof replaceMonthlyBudget>
>
export const replaceMonthlyBudgetMutationDefinition =
  createAppMutationDefinition<
    ReplaceMonthlyBudgetResponse,
    ReplaceMonthlyBudgetVariables
  >({
    defaultErrorMessage:
      "We couldn't save this monthly budget. Please try again.",
    mutationFn: ({ month, body }) => replaceMonthlyBudget(month, body),
    mutationKey: ["budgets", "replace-month"],
  })
export function useReplaceMonthlyBudgetMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    ReplaceMonthlyBudgetResponse,
    ReplaceMonthlyBudgetVariables,
    TContext
  >,
) {
  return useAppMutation(replaceMonthlyBudgetMutationDefinition, options)
}
