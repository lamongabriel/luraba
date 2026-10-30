"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { updateUserProfile } from "@/services/auth.service";

type UpdateUserProfileBody = Parameters<typeof updateUserProfile>[0];
type UpdateUserProfileResponse = Awaited<ReturnType<typeof updateUserProfile>>;

export const updateUserProfileMutationDefinition = createAppMutationDefinition<
  UpdateUserProfileResponse,
  UpdateUserProfileBody
>({
  defaultErrorMessage: "We couldn't update your profile. Please try again.",
  mutationFn: updateUserProfile,
  mutationKey: ["auth", "profile", "update"],
});
export function useUpdateUserProfileMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UpdateUserProfileResponse, UpdateUserProfileBody, TContext>,
) {
  return useAppMutation(updateUserProfileMutationDefinition, options);
}
