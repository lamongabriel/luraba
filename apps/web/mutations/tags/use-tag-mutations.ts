"use client"

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import { createTag, deleteTag, updateTag } from "@/services/tags.service"

type CreateTagBody = Parameters<typeof createTag>[0]
type CreateTagResponse = Awaited<ReturnType<typeof createTag>>
type UpdateTagVariables = {
  id: string
  body: Parameters<typeof updateTag>[1]
}
type UpdateTagResponse = Awaited<ReturnType<typeof updateTag>>

export const createTagMutationDefinition = createAppMutationDefinition<
  CreateTagResponse,
  CreateTagBody
>({
  defaultErrorMessage: "We couldn't create this tag. Please try again.",
  mutationFn: createTag,
  mutationKey: ["tags", "create"],
})
export function useCreateTagMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateTagResponse, CreateTagBody, TContext>,
) {
  return useAppMutation(createTagMutationDefinition, options)
}

export const updateTagMutationDefinition = createAppMutationDefinition<
  UpdateTagResponse,
  UpdateTagVariables
>({
  defaultErrorMessage: "We couldn't update this tag. Please try again.",
  mutationFn: ({ id, body }) => updateTag(id, body),
  mutationKey: ["tags", "update"],
})
export function useUpdateTagMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateTagResponse,
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
