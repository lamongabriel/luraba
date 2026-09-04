"use client"

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/services/categories.service"

type CreateCategoryBody = Parameters<typeof createCategory>[0]
type CreateCategoryResponse = Awaited<ReturnType<typeof createCategory>>
type UpdateCategoryVariables = {
  id: string
  body: Parameters<typeof updateCategory>[1]
}
type UpdateCategoryResponse = Awaited<ReturnType<typeof updateCategory>>

export const createCategoryMutationDefinition = createAppMutationDefinition<
  CreateCategoryResponse,
  CreateCategoryBody
>({
  defaultErrorMessage: "We couldn't create this category. Please try again.",
  mutationFn: createCategory,
  mutationKey: ["categories", "create"],
})

export function useCreateCategoryMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateCategoryResponse,
    CreateCategoryBody,
    TContext
  >,
) {
  return useAppMutation(createCategoryMutationDefinition, options)
}

export const updateCategoryMutationDefinition = createAppMutationDefinition<
  UpdateCategoryResponse,
  UpdateCategoryVariables
>({
  defaultErrorMessage: "We couldn't update this category. Please try again.",
  mutationFn: ({ id, body }) => updateCategory(id, body),
  mutationKey: ["categories", "update"],
})

export function useUpdateCategoryMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCategoryResponse,
    UpdateCategoryVariables,
    TContext
  >,
) {
  return useAppMutation(updateCategoryMutationDefinition, options)
}

export const deleteCategoryMutationDefinition = createAppMutationDefinition<
  void,
  string
>({
  defaultErrorMessage: "We couldn't delete this category. Please try again.",
  mutationFn: deleteCategory,
  mutationKey: ["categories", "delete"],
})

export function useDeleteCategoryMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteCategoryMutationDefinition, options)
}
