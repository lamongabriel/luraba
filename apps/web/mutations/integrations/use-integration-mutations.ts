"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import {
  deleteBrandfetchIntegration,
  updateBrandfetchIntegration,
} from "@/services/integrations.service";

type UpdateBrandfetchIntegrationBody = Parameters<typeof updateBrandfetchIntegration>[0];
type UpdateBrandfetchIntegrationResponse = Awaited<ReturnType<typeof updateBrandfetchIntegration>>;
type DeleteBrandfetchIntegrationResponse = Awaited<ReturnType<typeof deleteBrandfetchIntegration>>;

export const updateBrandfetchIntegrationMutationDefinition = createAppMutationDefinition<
  UpdateBrandfetchIntegrationResponse,
  UpdateBrandfetchIntegrationBody
>({
  defaultErrorMessage: "We couldn't connect Brandfetch. Please verify the client ID and try again.",
  mutationFn: updateBrandfetchIntegration,
  mutationKey: ["integrations", "brandfetch", "update"],
});
export function useUpdateBrandfetchIntegrationMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateBrandfetchIntegrationResponse,
    UpdateBrandfetchIntegrationBody,
    TContext
  >,
) {
  return useAppMutation(updateBrandfetchIntegrationMutationDefinition, options);
}

export const deleteBrandfetchIntegrationMutationDefinition = createAppMutationDefinition<
  DeleteBrandfetchIntegrationResponse,
  void
>({
  defaultErrorMessage: "We couldn't disconnect Brandfetch. Please try again.",
  mutationFn: deleteBrandfetchIntegration,
  mutationKey: ["integrations", "brandfetch", "delete"],
});
export function useDeleteBrandfetchIntegrationMutation<TContext = unknown>(
  options?: UseAppMutationOptions<DeleteBrandfetchIntegrationResponse, void, TContext>,
) {
  return useAppMutation(deleteBrandfetchIntegrationMutationDefinition, options);
}
