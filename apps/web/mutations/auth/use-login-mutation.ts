"use client";

import { lurabaAuthApiClient } from "@/api/luraba-auth-api";
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import type { SignInEmailInput } from "@/services/auth-sdk.types";

export const loginMutationDefinition = createAppMutationDefinition<void, SignInEmailInput>({
  defaultErrorMessage: "We couldn't sign you in. Please check your credentials.",
  mutationFn: async (body) => {
    await lurabaAuthApiClient.signIn.email({
      email: body.email,
      password: body.password,
      fetchOptions: {
        throw: true,
      },
    });
  },
  mutationKey: ["auth", "login"],
});

export function useLoginMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, SignInEmailInput, TContext>,
) {
  return useAppMutation(loginMutationDefinition, options);
}
