"use client"

import { lurabaAuthApiClient } from "@/api/luraba-auth-api"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import type { SignInSocialInput } from "@/services/auth-sdk.types"

export const socialSignInMutationDefinition = createAppMutationDefinition<
  void,
  SignInSocialInput
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
  options?: UseAppMutationOptions<void, SignInSocialInput, TContext>,
) {
  return useAppMutation(socialSignInMutationDefinition, options)
}
