"use client";

import type {
  CreateAccountInput,
  CreateAccountResult,
  UpdateAccountInput,
  UpdateAccountResult,
} from "@luraba/contracts";
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { createAccount, deleteAccount, updateAccount } from "@/services/accounts.service";

export const createAccountMutationDefinition = createAppMutationDefinition<
  CreateAccountResult,
  CreateAccountInput
>({
  defaultErrorMessage:
    "We couldn't create this account. Please review the information and try again.",
  mutationFn: createAccount,
  mutationKey: ["accounts", "create"],
});

export function useCreateAccountMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateAccountResult, CreateAccountInput, TContext>,
) {
  return useAppMutation(createAccountMutationDefinition, options);
}

type UpdateAccountVariables = { id: string; body: UpdateAccountInput };

export const updateAccountMutationDefinition = createAppMutationDefinition<
  UpdateAccountResult,
  UpdateAccountVariables
>({
  defaultErrorMessage: "We couldn't update this account. Please try again.",
  mutationFn: ({ id, body }) => updateAccount(id, body),
  mutationKey: ["accounts", "update"],
});

export function useUpdateAccountMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UpdateAccountResult, UpdateAccountVariables, TContext>,
) {
  return useAppMutation(updateAccountMutationDefinition, options);
}

export const deleteAccountMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this account. Please try again.",
  mutationFn: deleteAccount,
  mutationKey: ["accounts", "delete"],
});

export function useDeleteAccountMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteAccountMutationDefinition, options);
}
