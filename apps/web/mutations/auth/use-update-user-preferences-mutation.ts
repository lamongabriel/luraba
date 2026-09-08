"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { updateUserPreferences } from "@/services/auth.service";

type UpdateUserPreferencesBody = Parameters<typeof updateUserPreferences>[0];
type UpdateUserPreferencesResponse = Awaited<ReturnType<typeof updateUserPreferences>>;

export const updateUserPreferencesMutationDefinition = createAppMutationDefinition<
  UpdateUserPreferencesResponse,
  UpdateUserPreferencesBody
>({
  defaultErrorMessage: "We couldn't update your preferences. Please try again.",
  mutationFn: updateUserPreferences,
  mutationKey: ["auth", "preferences", "update"],
});
export function useUpdateUserPreferencesMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateUserPreferencesResponse,
    UpdateUserPreferencesBody,
    TContext
  >,
) {
  return useAppMutation(updateUserPreferencesMutationDefinition, options);
}
