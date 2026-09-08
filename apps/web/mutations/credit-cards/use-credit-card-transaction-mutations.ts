"use client";

import type {
  CreateCreditCardPaymentInput,
  CreateCreditCardPaymentResult,
  CreateCreditCardPurchaseInput,
  CreateCreditCardPurchaseResult,
  UpdateCreditCardPaymentInput,
  UpdateCreditCardPaymentResult,
  UpdateCreditCardPurchaseInput,
  UpdateCreditCardPurchaseResult,
} from "@luraba/contracts";
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import {
  createCreditCardPayment,
  createCreditCardPurchase,
  deleteCreditCardPayment,
  deleteCreditCardPurchase,
  updateCreditCardPayment,
  updateCreditCardPurchase,
} from "@/services/credit-cards.service";

export const createCreditCardPurchaseMutationDefinition = createAppMutationDefinition<
  CreateCreditCardPurchaseResult,
  { creditCardId: string; body: CreateCreditCardPurchaseInput }
>({
  defaultErrorMessage:
    "We couldn't create this credit card purchase. Please review the form and try again.",
  mutationFn: ({ creditCardId, body }) => createCreditCardPurchase(creditCardId, body),
  mutationKey: ["credit-cards", "purchases", "create"],
});

export function useCreateCreditCardPurchaseMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateCreditCardPurchaseResult,
    { creditCardId: string; body: CreateCreditCardPurchaseInput },
    TContext
  >,
) {
  return useAppMutation(createCreditCardPurchaseMutationDefinition, options);
}

export const updateCreditCardPurchaseMutationDefinition = createAppMutationDefinition<
  UpdateCreditCardPurchaseResult,
  {
    creditCardId: string;
    purchaseId: string;
    body: UpdateCreditCardPurchaseInput;
  }
>({
  defaultErrorMessage:
    "We couldn't update this credit card purchase. Please review the form and try again.",
  mutationFn: ({ creditCardId, purchaseId, body }) =>
    updateCreditCardPurchase(creditCardId, purchaseId, body),
  mutationKey: ["credit-cards", "purchases", "update"],
});

export function useUpdateCreditCardPurchaseMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCreditCardPurchaseResult,
    {
      creditCardId: string;
      purchaseId: string;
      body: UpdateCreditCardPurchaseInput;
    },
    TContext
  >,
) {
  return useAppMutation(updateCreditCardPurchaseMutationDefinition, options);
}

export const deleteCreditCardPurchaseMutationDefinition = createAppMutationDefinition<
  void,
  { creditCardId: string; purchaseId: string }
>({
  defaultErrorMessage: "We couldn't delete this credit card purchase. Please try again.",
  mutationFn: ({ creditCardId, purchaseId }) => deleteCreditCardPurchase(creditCardId, purchaseId),
  mutationKey: ["credit-cards", "purchases", "delete"],
});

export function useDeleteCreditCardPurchaseMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, { creditCardId: string; purchaseId: string }, TContext>,
) {
  return useAppMutation(deleteCreditCardPurchaseMutationDefinition, options);
}

export const createCreditCardPaymentMutationDefinition = createAppMutationDefinition<
  CreateCreditCardPaymentResult,
  { creditCardId: string; body: CreateCreditCardPaymentInput }
>({
  defaultErrorMessage:
    "We couldn't create this credit card payment. Please review the form and try again.",
  mutationFn: ({ creditCardId, body }) => createCreditCardPayment(creditCardId, body),
  mutationKey: ["credit-cards", "payments", "create"],
});

export function useCreateCreditCardPaymentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateCreditCardPaymentResult,
    { creditCardId: string; body: CreateCreditCardPaymentInput },
    TContext
  >,
) {
  return useAppMutation(createCreditCardPaymentMutationDefinition, options);
}

export const updateCreditCardPaymentMutationDefinition = createAppMutationDefinition<
  UpdateCreditCardPaymentResult,
  {
    creditCardId: string;
    paymentId: string;
    body: UpdateCreditCardPaymentInput;
  }
>({
  defaultErrorMessage:
    "We couldn't update this credit card payment. Please review the form and try again.",
  mutationFn: ({ creditCardId, paymentId, body }) =>
    updateCreditCardPayment(creditCardId, paymentId, body),
  mutationKey: ["credit-cards", "payments", "update"],
});

export function useUpdateCreditCardPaymentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCreditCardPaymentResult,
    {
      creditCardId: string;
      paymentId: string;
      body: UpdateCreditCardPaymentInput;
    },
    TContext
  >,
) {
  return useAppMutation(updateCreditCardPaymentMutationDefinition, options);
}

export const deleteCreditCardPaymentMutationDefinition = createAppMutationDefinition<
  void,
  { creditCardId: string; paymentId: string }
>({
  defaultErrorMessage: "We couldn't delete this credit card payment. Please try again.",
  mutationFn: ({ creditCardId, paymentId }) => deleteCreditCardPayment(creditCardId, paymentId),
  mutationKey: ["credit-cards", "payments", "delete"],
});

export function useDeleteCreditCardPaymentMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, { creditCardId: string; paymentId: string }, TContext>,
) {
  return useAppMutation(deleteCreditCardPaymentMutationDefinition, options);
}
