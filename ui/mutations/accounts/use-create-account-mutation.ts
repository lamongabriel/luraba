"use client"

import type { CreateAccountHttpBody, CreateAccountHttpResponse } from "@/interfaces/http/accounts-http"
import { createAccount } from "@/services/accounts.service"
import {
  createAppMutationDefinition,
  useAppMutation,
  type UseAppMutationOptions,
} from "@/mutations/app-mutation"

export const createAccountMutationDefinition = createAppMutationDefinition<
  CreateAccountHttpResponse,
  CreateAccountHttpBody
>({
  defaultErrorMessage: "We couldn't create this account. Please review the information and try again.",
  mutationFn: async (body) => createAccount(body),
  mutationKey: ["accounts", "create"],
})

export function useCreateAccountMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateAccountHttpResponse, CreateAccountHttpBody, TContext>,
) {
  return useAppMutation(createAccountMutationDefinition, options)
}
