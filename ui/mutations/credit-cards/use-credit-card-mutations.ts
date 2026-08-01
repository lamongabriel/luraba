"use client"

import type {
  CreateCreditCardHttpBody,
  CreateCreditCardHttpResponse,
  UpdateCreditCardCycleHttpBody,
  UpdateCreditCardCycleHttpResponse,
  UpdateCreditCardHttpBody,
  UpdateCreditCardHttpResponse,
} from "@/interfaces/http/credit-cards-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createCreditCard,
  deleteCreditCard,
  updateCreditCard,
  updateCreditCardCycle,
} from "@/services/credit-cards.service"

export const createCreditCardMutationDefinition = createAppMutationDefinition<
  CreateCreditCardHttpResponse,
  CreateCreditCardHttpBody
>({
  defaultErrorMessage: "We couldn't create this credit card. Please try again.",
  mutationFn: createCreditCard,
  mutationKey: ["credit-cards", "create"],
})

export function useCreateCreditCardMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateCreditCardHttpResponse,
    CreateCreditCardHttpBody,
    TContext
  >,
) {
  return useAppMutation(createCreditCardMutationDefinition, options)
}

type UpdateCreditCardVariables = {
  creditCardId: string
  body: UpdateCreditCardHttpBody
}
export const updateCreditCardMutationDefinition = createAppMutationDefinition<
  UpdateCreditCardHttpResponse,
  UpdateCreditCardVariables
>({
  defaultErrorMessage: "We couldn't update this credit card. Please try again.",
  mutationFn: updateCreditCard,
  mutationKey: ["credit-cards", "update"],
})

export function useUpdateCreditCardMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCreditCardHttpResponse,
    UpdateCreditCardVariables,
    TContext
  >,
) {
  return useAppMutation(updateCreditCardMutationDefinition, options)
}

export const deleteCreditCardMutationDefinition = createAppMutationDefinition<
  void,
  string
>({
  defaultErrorMessage: "We couldn't delete this credit card. Please try again.",
  mutationFn: deleteCreditCard,
  mutationKey: ["credit-cards", "delete"],
})

export function useDeleteCreditCardMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteCreditCardMutationDefinition, options)
}

type UpdateCreditCardCycleVariables = {
  creditCardId: string
  cycleId: string
  body: UpdateCreditCardCycleHttpBody
}
export const updateCreditCardCycleMutationDefinition =
  createAppMutationDefinition<
    UpdateCreditCardCycleHttpResponse,
    UpdateCreditCardCycleVariables
  >({
    defaultErrorMessage:
      "We couldn't update this billing cycle. Please try again.",
    mutationFn: updateCreditCardCycle,
    mutationKey: ["credit-cards", "cycles", "update"],
  })

export function useUpdateCreditCardCycleMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCreditCardCycleHttpResponse,
    UpdateCreditCardCycleVariables,
    TContext
  >,
) {
  return useAppMutation(updateCreditCardCycleMutationDefinition, options)
}

export {
  createCreditCardPaymentMutationDefinition,
  createCreditCardPurchaseMutationDefinition,
  deleteCreditCardPaymentMutationDefinition,
  deleteCreditCardPurchaseMutationDefinition,
  updateCreditCardPaymentMutationDefinition,
  updateCreditCardPurchaseMutationDefinition,
  useCreateCreditCardPaymentMutation,
  useCreateCreditCardPurchaseMutation,
  useDeleteCreditCardPaymentMutation,
  useDeleteCreditCardPurchaseMutation,
  useUpdateCreditCardPaymentMutation,
  useUpdateCreditCardPurchaseMutation,
} from "@/mutations/credit-cards/use-credit-card-transaction-mutations"
