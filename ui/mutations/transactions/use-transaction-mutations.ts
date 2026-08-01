"use client"

import type {
  CreateTransactionHttpBody,
  CreateTransactionHttpResponse,
  UpdateTransactionHttpBody,
  UpdateTransactionHttpResponse,
} from "@/interfaces/http/transactions-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/services/transactions.service"

export const createTransactionMutationDefinition = createAppMutationDefinition<
  CreateTransactionHttpResponse,
  CreateTransactionHttpBody
>({
  defaultErrorMessage:
    "We couldn't create this transaction. Please review the form and try again.",
  mutationFn: async (body) => createTransaction(body),
  mutationKey: ["transactions", "create"],
})

export function useCreateTransactionMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateTransactionHttpResponse,
    CreateTransactionHttpBody,
    TContext
  >,
) {
  return useAppMutation(createTransactionMutationDefinition, options)
}

export const updateTransactionMutationDefinition = createAppMutationDefinition<
  UpdateTransactionHttpResponse,
  { id: string; body: UpdateTransactionHttpBody }
>({
  defaultErrorMessage:
    "We couldn't update this transaction. Please review the form and try again.",
  mutationFn: async (variables) => updateTransaction(variables),
  mutationKey: ["transactions", "update"],
})

export function useUpdateTransactionMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateTransactionHttpResponse,
    { id: string; body: UpdateTransactionHttpBody },
    TContext
  >,
) {
  return useAppMutation(updateTransactionMutationDefinition, options)
}

export const deleteTransactionMutationDefinition = createAppMutationDefinition<
  void,
  string
>({
  defaultErrorMessage: "We couldn't delete this transaction. Please try again.",
  mutationFn: async (id) => deleteTransaction(id),
  mutationKey: ["transactions", "delete"],
})

export function useDeleteTransactionMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteTransactionMutationDefinition, options)
}
