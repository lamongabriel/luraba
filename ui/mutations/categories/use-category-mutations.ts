"use client"

import type {
  CreateCategoryHttpBody,
  CreateCategoryHttpResponse,
  UpdateCategoryHttpBody,
  UpdateCategoryHttpResponse,
} from "@/interfaces/http/categories-http"
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

export const createCategoryMutationDefinition = createAppMutationDefinition<
  CreateCategoryHttpResponse,
  CreateCategoryHttpBody
>({
  defaultErrorMessage: "We couldn't create this category. Please try again.",
  mutationFn: createCategory,
  mutationKey: ["categories", "create"],
})

export function useCreateCategoryMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateCategoryHttpResponse,
    CreateCategoryHttpBody,
    TContext
  >,
) {
  return useAppMutation(createCategoryMutationDefinition, options)
}

type UpdateCategoryVariables = { id: string; body: UpdateCategoryHttpBody }
export const updateCategoryMutationDefinition = createAppMutationDefinition<
  UpdateCategoryHttpResponse,
  UpdateCategoryVariables
>({
  defaultErrorMessage: "We couldn't update this category. Please try again.",
  mutationFn: updateCategory,
  mutationKey: ["categories", "update"],
})

export function useUpdateCategoryMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCategoryHttpResponse,
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
