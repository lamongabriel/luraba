"use client"

import type { SignUpEmailHttpBody } from "@/interfaces/http/auth-http"
import { lurabaAuthApiClient } from "@/api/luraba-auth-api"
import {
  createAppMutationDefinition,
  useAppMutation,
  type UseAppMutationOptions,
} from "@/mutations/app-mutation"

export const registerMutationDefinition = createAppMutationDefinition<
  void,
  SignUpEmailHttpBody
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
  options?: UseAppMutationOptions<void, SignUpEmailHttpBody, TContext>,
) {
  return useAppMutation(registerMutationDefinition, options)
}
