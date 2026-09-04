"use client"

import type {
  CreateTransactionInput,
  CreateTransactionResult,
  UpdateTransactionInput,
  UpdateTransactionResult,
} from "@luraba/contracts"
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
  CreateTransactionResult,
  CreateTransactionInput
>({
  defaultErrorMessage:
    "We couldn't create this transaction. Please review the form and try again.",
  mutationFn: async (body) => createTransaction(body),
  mutationKey: ["transactions", "create"],
})

export function useCreateTransactionMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateTransactionResult,
    CreateTransactionInput,
    TContext
  >,
) {
  return useAppMutation(createTransactionMutationDefinition, options)
}

export const updateTransactionMutationDefinition = createAppMutationDefinition<
  UpdateTransactionResult,
  { id: string; body: UpdateTransactionInput }
>({
  defaultErrorMessage:
    "We couldn't update this transaction. Please review the form and try again.",
  mutationFn: ({ id, body }) => updateTransaction(id, body),
  mutationKey: ["transactions", "update"],
})

export function useUpdateTransactionMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateTransactionResult,
    { id: string; body: UpdateTransactionInput },
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
