"use client"

import type {
  ReplaceMonthlyBudgetHttpBody,
  ReplaceMonthlyBudgetHttpResponse,
} from "@/interfaces/http/budgets-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import { replaceMonthlyBudget } from "@/services/budgets.service"

type ReplaceMonthlyBudgetVariables = {
  month: string
  body: ReplaceMonthlyBudgetHttpBody
}
export const replaceMonthlyBudgetMutationDefinition =
  createAppMutationDefinition<
    ReplaceMonthlyBudgetHttpResponse,
    ReplaceMonthlyBudgetVariables
  >({
    defaultErrorMessage:
      "We couldn't save this monthly budget. Please try again.",
    mutationFn: replaceMonthlyBudget,
    mutationKey: ["budgets", "replace-month"],
  })
export function useReplaceMonthlyBudgetMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    ReplaceMonthlyBudgetHttpResponse,
    ReplaceMonthlyBudgetVariables,
    TContext
  >,
) {
  return useAppMutation(replaceMonthlyBudgetMutationDefinition, options)
}
