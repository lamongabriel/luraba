"use client";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { createApiKey, deleteApiKey, updateApiKey } from "@/services/api-keys.service";

type CreateApiKeyBody = Parameters<typeof createApiKey>[0];
type CreateApiKeyResponse = Awaited<ReturnType<typeof createApiKey>>;
type UpdateApiKeyVariables = { id: string; body: Parameters<typeof updateApiKey>[1] };
type UpdateApiKeyResponse = Awaited<ReturnType<typeof updateApiKey>>;

export const createApiKeyMutationDefinition = createAppMutationDefinition<
  CreateApiKeyResponse,
  CreateApiKeyBody
>({
  defaultErrorMessage: "We couldn't create this API key. Please try again.",
  mutationFn: createApiKey,
  mutationKey: ["api-keys", "create"],
});
export function useCreateApiKeyMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateApiKeyResponse, CreateApiKeyBody, TContext>,
) {
  return useAppMutation(createApiKeyMutationDefinition, options);
}

export const updateApiKeyMutationDefinition = createAppMutationDefinition<
  UpdateApiKeyResponse,
  UpdateApiKeyVariables
>({
  defaultErrorMessage: "We couldn't update this API key. Please try again.",
  mutationFn: ({ id, body }) => updateApiKey(id, body),
  mutationKey: ["api-keys", "update"],
});
export function useUpdateApiKeyMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UpdateApiKeyResponse, UpdateApiKeyVariables, TContext>,
) {
  return useAppMutation(updateApiKeyMutationDefinition, options);
}

export const deleteApiKeyMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this API key. Please try again.",
  mutationFn: deleteApiKey,
  mutationKey: ["api-keys", "delete"],
});
export function useDeleteApiKeyMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteApiKeyMutationDefinition, options);
}
