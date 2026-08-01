"use client"

import type {
  CreateCreditCardPaymentHttpBody,
  CreateCreditCardPaymentHttpResponse,
  CreateCreditCardPurchaseHttpBody,
  CreateCreditCardPurchaseHttpResponse,
  UpdateCreditCardPaymentHttpBody,
  UpdateCreditCardPaymentHttpResponse,
  UpdateCreditCardPurchaseHttpBody,
  UpdateCreditCardPurchaseHttpResponse,
} from "@/interfaces/http/credit-cards-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createCreditCardPayment,
  createCreditCardPurchase,
  deleteCreditCardPayment,
  deleteCreditCardPurchase,
  updateCreditCardPayment,
  updateCreditCardPurchase,
} from "@/services/credit-cards.service"

export const createCreditCardPurchaseMutationDefinition =
  createAppMutationDefinition<
    CreateCreditCardPurchaseHttpResponse,
    { creditCardId: string; body: CreateCreditCardPurchaseHttpBody }
  >({
    defaultErrorMessage:
      "We couldn't create this credit card purchase. Please review the form and try again.",
    mutationFn: async (variables) => createCreditCardPurchase(variables),
    mutationKey: ["credit-cards", "purchases", "create"],
  })

export function useCreateCreditCardPurchaseMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateCreditCardPurchaseHttpResponse,
    { creditCardId: string; body: CreateCreditCardPurchaseHttpBody },
    TContext
  >,
) {
  return useAppMutation(createCreditCardPurchaseMutationDefinition, options)
}

export const updateCreditCardPurchaseMutationDefinition =
  createAppMutationDefinition<
    UpdateCreditCardPurchaseHttpResponse,
    {
      creditCardId: string
      purchaseId: string
      body: UpdateCreditCardPurchaseHttpBody
    }
  >({
    defaultErrorMessage:
      "We couldn't update this credit card purchase. Please review the form and try again.",
    mutationFn: async (variables) => updateCreditCardPurchase(variables),
    mutationKey: ["credit-cards", "purchases", "update"],
  })

export function useUpdateCreditCardPurchaseMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCreditCardPurchaseHttpResponse,
    {
      creditCardId: string
      purchaseId: string
      body: UpdateCreditCardPurchaseHttpBody
    },
    TContext
  >,
) {
  return useAppMutation(updateCreditCardPurchaseMutationDefinition, options)
}

export const deleteCreditCardPurchaseMutationDefinition =
  createAppMutationDefinition<
    void,
    { creditCardId: string; purchaseId: string }
  >({
    defaultErrorMessage:
      "We couldn't delete this credit card purchase. Please try again.",
    mutationFn: async (variables) => deleteCreditCardPurchase(variables),
    mutationKey: ["credit-cards", "purchases", "delete"],
  })

export function useDeleteCreditCardPurchaseMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    void,
    { creditCardId: string; purchaseId: string },
    TContext
  >,
) {
  return useAppMutation(deleteCreditCardPurchaseMutationDefinition, options)
}

export const createCreditCardPaymentMutationDefinition =
  createAppMutationDefinition<
    CreateCreditCardPaymentHttpResponse,
    { creditCardId: string; body: CreateCreditCardPaymentHttpBody }
  >({
    defaultErrorMessage:
      "We couldn't create this credit card payment. Please review the form and try again.",
    mutationFn: async (variables) => createCreditCardPayment(variables),
    mutationKey: ["credit-cards", "payments", "create"],
  })

export function useCreateCreditCardPaymentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateCreditCardPaymentHttpResponse,
    { creditCardId: string; body: CreateCreditCardPaymentHttpBody },
    TContext
  >,
) {
  return useAppMutation(createCreditCardPaymentMutationDefinition, options)
}

export const updateCreditCardPaymentMutationDefinition =
  createAppMutationDefinition<
    UpdateCreditCardPaymentHttpResponse,
    {
      creditCardId: string
      paymentId: string
      body: UpdateCreditCardPaymentHttpBody
    }
  >({
    defaultErrorMessage:
      "We couldn't update this credit card payment. Please review the form and try again.",
    mutationFn: async (variables) => updateCreditCardPayment(variables),
    mutationKey: ["credit-cards", "payments", "update"],
  })

export function useUpdateCreditCardPaymentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCreditCardPaymentHttpResponse,
    {
      creditCardId: string
      paymentId: string
      body: UpdateCreditCardPaymentHttpBody
    },
    TContext
  >,
) {
  return useAppMutation(updateCreditCardPaymentMutationDefinition, options)
}

export const deleteCreditCardPaymentMutationDefinition =
  createAppMutationDefinition<
    void,
    { creditCardId: string; paymentId: string }
  >({
    defaultErrorMessage:
      "We couldn't delete this credit card payment. Please try again.",
    mutationFn: async (variables) => deleteCreditCardPayment(variables),
    mutationKey: ["credit-cards", "payments", "delete"],
  })

export function useDeleteCreditCardPaymentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    void,
    { creditCardId: string; paymentId: string },
    TContext
  >,
) {
  return useAppMutation(deleteCreditCardPaymentMutationDefinition, options)
}
