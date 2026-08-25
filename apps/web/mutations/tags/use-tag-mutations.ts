"use client"

import type {
  CreateTagHttpBody,
  CreateTagHttpResponse,
  UpdateTagHttpBody,
  UpdateTagHttpResponse,
} from "@/interfaces/http/tags-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import { createTag, deleteTag, updateTag } from "@/services/tags.service"

export const createTagMutationDefinition = createAppMutationDefinition<
  CreateTagHttpResponse,
  CreateTagHttpBody
>({
  defaultErrorMessage: "We couldn't create this tag. Please try again.",
  mutationFn: createTag,
  mutationKey: ["tags", "create"],
})
export function useCreateTagMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateTagHttpResponse,
    CreateTagHttpBody,
    TContext
  >,
) {
  return useAppMutation(createTagMutationDefinition, options)
}

type UpdateTagVariables = { id: string; body: UpdateTagHttpBody }
export const updateTagMutationDefinition = createAppMutationDefinition<
  UpdateTagHttpResponse,
  UpdateTagVariables
>({
  defaultErrorMessage: "We couldn't update this tag. Please try again.",
  mutationFn: updateTag,
  mutationKey: ["tags", "update"],
})
export function useUpdateTagMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateTagHttpResponse,
    UpdateTagVariables,
    TContext
  >,
) {
  return useAppMutation(updateTagMutationDefinition, options)
}

export const deleteTagMutationDefinition = createAppMutationDefinition<
  void,
  string
>({
  defaultErrorMessage: "We couldn't delete this tag. Please try again.",
  mutationFn: deleteTag,
  mutationKey: ["tags", "delete"],
})
export function useDeleteTagMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteTagMutationDefinition, options)
}
