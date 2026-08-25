"use client"

import type {
  DeleteBrandfetchIntegrationHttpResponse,
  UpdateBrandfetchIntegrationHttpBody,
  UpdateBrandfetchIntegrationHttpResponse,
} from "@/interfaces/http/integrations-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  deleteBrandfetchIntegration,
  updateBrandfetchIntegration,
} from "@/services/integrations.service"

export const updateBrandfetchIntegrationMutationDefinition =
  createAppMutationDefinition<
    UpdateBrandfetchIntegrationHttpResponse,
    UpdateBrandfetchIntegrationHttpBody
  >({
    defaultErrorMessage:
      "We couldn't connect Brandfetch. Please verify the client ID and try again.",
    mutationFn: updateBrandfetchIntegration,
    mutationKey: ["integrations", "brandfetch", "update"],
  })
export function useUpdateBrandfetchIntegrationMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateBrandfetchIntegrationHttpResponse,
    UpdateBrandfetchIntegrationHttpBody,
    TContext
  >,
) {
  return useAppMutation(updateBrandfetchIntegrationMutationDefinition, options)
}

export const deleteBrandfetchIntegrationMutationDefinition =
  createAppMutationDefinition<DeleteBrandfetchIntegrationHttpResponse, void>({
    defaultErrorMessage: "We couldn't disconnect Brandfetch. Please try again.",
    mutationFn: deleteBrandfetchIntegration,
    mutationKey: ["integrations", "brandfetch", "delete"],
  })
export function useDeleteBrandfetchIntegrationMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    DeleteBrandfetchIntegrationHttpResponse,
    void,
    TContext
  >,
) {
  return useAppMutation(deleteBrandfetchIntegrationMutationDefinition, options)
}
