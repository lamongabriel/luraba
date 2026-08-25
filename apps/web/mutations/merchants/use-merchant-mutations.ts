"use client"

import type {
  CreateMerchantHttpBody,
  CreateMerchantHttpResponse,
  UpdateMerchantHttpBody,
  UpdateMerchantHttpResponse,
} from "@/interfaces/http/merchants-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createMerchant,
  deleteMerchant,
  updateMerchant,
} from "@/services/merchants.service"

export const createMerchantMutationDefinition = createAppMutationDefinition<
  CreateMerchantHttpResponse,
  CreateMerchantHttpBody
>({
  defaultErrorMessage: "We couldn't create this merchant. Please try again.",
  mutationFn: createMerchant,
  mutationKey: ["merchants", "create"],
})
export function useCreateMerchantMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateMerchantHttpResponse,
    CreateMerchantHttpBody,
    TContext
  >,
) {
  return useAppMutation(createMerchantMutationDefinition, options)
}

type UpdateMerchantVariables = { id: string; body: UpdateMerchantHttpBody }
export const updateMerchantMutationDefinition = createAppMutationDefinition<
  UpdateMerchantHttpResponse,
  UpdateMerchantVariables
>({
  defaultErrorMessage: "We couldn't update this merchant. Please try again.",
  mutationFn: updateMerchant,
  mutationKey: ["merchants", "update"],
})
export function useUpdateMerchantMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateMerchantHttpResponse,
    UpdateMerchantVariables,
    TContext
  >,
) {
  return useAppMutation(updateMerchantMutationDefinition, options)
}

export const deleteMerchantMutationDefinition = createAppMutationDefinition<
  void,
  string
>({
  defaultErrorMessage: "We couldn't delete this merchant. Please try again.",
  mutationFn: deleteMerchant,
  mutationKey: ["merchants", "delete"],
})
export function useDeleteMerchantMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteMerchantMutationDefinition, options)
}
