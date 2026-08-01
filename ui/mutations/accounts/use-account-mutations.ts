"use client"

import type {
  CreateAccountHttpBody,
  CreateAccountHttpResponse,
  UpdateAccountHttpBody,
  UpdateAccountHttpResponse,
} from "@/interfaces/http/accounts-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createAccount,
  deleteAccount,
  updateAccount,
} from "@/services/accounts.service"

export const createAccountMutationDefinition = createAppMutationDefinition<
  CreateAccountHttpResponse,
  CreateAccountHttpBody
>({
  defaultErrorMessage:
    "We couldn't create this account. Please review the information and try again.",
  mutationFn: createAccount,
  mutationKey: ["accounts", "create"],
})

export function useCreateAccountMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateAccountHttpResponse,
    CreateAccountHttpBody,
    TContext
  >,
) {
  return useAppMutation(createAccountMutationDefinition, options)
}

type UpdateAccountVariables = { id: string; body: UpdateAccountHttpBody }

export const updateAccountMutationDefinition = createAppMutationDefinition<
  UpdateAccountHttpResponse,
  UpdateAccountVariables
>({
  defaultErrorMessage: "We couldn't update this account. Please try again.",
  mutationFn: updateAccount,
  mutationKey: ["accounts", "update"],
})

export function useUpdateAccountMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateAccountHttpResponse,
    UpdateAccountVariables,
    TContext
  >,
) {
  return useAppMutation(updateAccountMutationDefinition, options)
}

export const deleteAccountMutationDefinition = createAppMutationDefinition<
  void,
  string
>({
  defaultErrorMessage: "We couldn't delete this account. Please try again.",
  mutationFn: deleteAccount,
  mutationKey: ["accounts", "delete"],
})

export function useDeleteAccountMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteAccountMutationDefinition, options)
}
