"use client"

import { lurabaAuthApiClient } from "@/api/luraba-auth-api"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import type { SignUpEmailInput } from "@/services/auth-sdk.types"

export const registerMutationDefinition = createAppMutationDefinition<
  void,
  SignUpEmailInput
>({
  defaultErrorMessage: "We couldn't create your account. Please try again.",
  mutationFn: async (body) => {
    await lurabaAuthApiClient.signUp.email({
      email: body.email,
      name: body.name,
      password: body.password,
      fetchOptions: {
        throw: true,
      },
    })
  },
  mutationKey: ["auth", "register"],
})

export function useRegisterMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, SignUpEmailInput, TContext>,
) {
  return useAppMutation(registerMutationDefinition, options)
}
