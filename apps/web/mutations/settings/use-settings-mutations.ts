"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { changePassword, revokeOtherSessions, updateProfile } from "@/services/settings.service";

export const updateProfileMutationDefinition = createAppMutationDefinition<
  unknown,
  { name: string; image?: string | null }
>({
  defaultErrorMessage: "We couldn't update your profile.",
  mutationFn: updateProfile,
  mutationKey: ["settings", "profile"],
});
export function useUpdateProfileMutation<TContext = unknown>(
  options?: UseAppMutationOptions<unknown, { name: string; image?: string | null }, TContext>,
) {
  return useAppMutation(updateProfileMutationDefinition, options);
}

export const changePasswordMutationDefinition = createAppMutationDefinition<
  unknown,
  {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }
>({
  defaultErrorMessage: "We couldn't change your password.",
  mutationFn: changePassword,
  mutationKey: ["settings", "security", "password"],
});
export function useChangePasswordMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    unknown,
    {
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    },
    TContext
  >,
) {
  return useAppMutation(changePasswordMutationDefinition, options);
}

export const revokeOtherSessionsMutationDefinition = createAppMutationDefinition<unknown, void>({
  defaultErrorMessage: "We couldn't sign out other sessions.",
  mutationFn: revokeOtherSessions,
  mutationKey: ["settings", "security", "sessions"],
});
export function useRevokeOtherSessionsMutation<TContext = unknown>(
  options?: UseAppMutationOptions<unknown, void, TContext>,
) {
  return useAppMutation(revokeOtherSessionsMutationDefinition, options);
}
