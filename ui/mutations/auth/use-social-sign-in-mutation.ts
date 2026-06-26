"use client"

import type { SignInSocialHttpBody } from "@/interfaces/http/auth-http"
import { lurabaAuthApiClient } from "@/api/luraba-auth-api"
import {
  createAppMutationDefinition,
  useAppMutation,
  type UseAppMutationOptions,
} from "@/mutations/app-mutation"

export const socialSignInMutationDefinition = createAppMutationDefinition<
  void,
  SignInSocialHttpBody
>({
  defaultErrorMessage: "We couldn't start that sign-in flow. Please try again.",
  mutationFn: async (body) => {
    await lurabaAuthApiClient.signIn.social({
      provider: body.provider,
      callbackURL: body.callbackURL,
    })
  },
  mutationKey: ["auth", "social-sign-in"],
})

export function useSocialSignInMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, SignInSocialHttpBody, TContext>,
) {
  return useAppMutation(socialSignInMutationDefinition, options)
}
