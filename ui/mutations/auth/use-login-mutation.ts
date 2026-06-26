"use client"

import type { SignInEmailHttpBody } from "@/interfaces/http/auth-http"
import { lurabaAuthApiClient } from "@/api/luraba-auth-api"
import {
  createAppMutationDefinition,
  useAppMutation,
  type UseAppMutationOptions,
} from "@/mutations/app-mutation"

export const loginMutationDefinition = createAppMutationDefinition<
  void,
  SignInEmailHttpBody
>({
  defaultErrorMessage: "We couldn't sign you in. Please check your credentials.",
  mutationFn: async (body) => {
    await lurabaAuthApiClient.signIn.email({
      email: body.email,
      password: body.password,
      fetchOptions: {
        throw: true,
      },
    })
  },
  mutationKey: ["auth", "login"],
})

export function useLoginMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, SignInEmailHttpBody, TContext>,
) {
  return useAppMutation(loginMutationDefinition, options)
}
