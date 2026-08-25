"use client"

import type {
  UpdateUserPreferencesHttpBody,
  UpdateUserPreferencesHttpResponse,
} from "@/interfaces/http/auth-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import { updateUserPreferences } from "@/services/auth.service"

export const updateUserPreferencesMutationDefinition =
  createAppMutationDefinition<
    UpdateUserPreferencesHttpResponse,
    UpdateUserPreferencesHttpBody
  >({
    defaultErrorMessage:
      "We couldn't update your preferences. Please try again.",
    mutationFn: updateUserPreferences,
    mutationKey: ["auth", "preferences", "update"],
  })
export function useUpdateUserPreferencesMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateUserPreferencesHttpResponse,
    UpdateUserPreferencesHttpBody,
    TContext
  >,
) {
  return useAppMutation(updateUserPreferencesMutationDefinition, options)
}
