"use client"

import type {
  CreatePaymentMethodHttpBody,
  CreatePaymentMethodHttpResponse,
  UpdatePaymentMethodHttpBody,
  UpdatePaymentMethodHttpResponse,
} from "@/interfaces/http/payment-methods-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createPaymentMethod,
  deletePaymentMethod,
  updatePaymentMethod,
} from "@/services/payment-methods.service"

export const createPaymentMethodMutationDefinition =
  createAppMutationDefinition<
    CreatePaymentMethodHttpResponse,
    CreatePaymentMethodHttpBody
  >({
    defaultErrorMessage:
      "We couldn't create this payment method. Please try again.",
    mutationFn: createPaymentMethod,
    mutationKey: ["payment-methods", "create"],
  })
export function useCreatePaymentMethodMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreatePaymentMethodHttpResponse,
    CreatePaymentMethodHttpBody,
    TContext
  >,
) {
  return useAppMutation(createPaymentMethodMutationDefinition, options)
}

type UpdatePaymentMethodVariables = {
  id: string
  body: UpdatePaymentMethodHttpBody
}
export const updatePaymentMethodMutationDefinition =
  createAppMutationDefinition<
    UpdatePaymentMethodHttpResponse,
    UpdatePaymentMethodVariables
  >({
    defaultErrorMessage:
      "We couldn't update this payment method. Please try again.",
    mutationFn: updatePaymentMethod,
    mutationKey: ["payment-methods", "update"],
  })
export function useUpdatePaymentMethodMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdatePaymentMethodHttpResponse,
    UpdatePaymentMethodVariables,
    TContext
  >,
) {
  return useAppMutation(updatePaymentMethodMutationDefinition, options)
}

export const deletePaymentMethodMutationDefinition =
  createAppMutationDefinition<void, string>({
    defaultErrorMessage:
      "We couldn't delete this payment method. Please try again.",
    mutationFn: deletePaymentMethod,
    mutationKey: ["payment-methods", "delete"],
  })
export function useDeletePaymentMethodMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deletePaymentMethodMutationDefinition, options)
}
