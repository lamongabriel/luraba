"use client";

import type {
  CreateCreditCardInput,
  CreateCreditCardResult,
  UpdateCreditCardCycleInput,
  UpdateCreditCardCycleResult,
  UpdateCreditCardInput,
  UpdateCreditCardResult,
} from "@luraba/contracts";
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import {
  createCreditCard,
  deleteCreditCard,
  updateCreditCard,
  updateCreditCardCycle,
} from "@/services/credit-cards.service";

export const createCreditCardMutationDefinition = createAppMutationDefinition<
  CreateCreditCardResult,
  CreateCreditCardInput
>({
  defaultErrorMessage: "We couldn't create this credit card. Please try again.",
  mutationFn: createCreditCard,
  mutationKey: ["credit-cards", "create"],
});

export function useCreateCreditCardMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CreateCreditCardResult, CreateCreditCardInput, TContext>,
) {
  return useAppMutation(createCreditCardMutationDefinition, options);
}

type UpdateCreditCardVariables = {
  creditCardId: string;
  body: UpdateCreditCardInput;
};
export const updateCreditCardMutationDefinition = createAppMutationDefinition<
  UpdateCreditCardResult,
  UpdateCreditCardVariables
>({
  defaultErrorMessage: "We couldn't update this credit card. Please try again.",
  mutationFn: ({ creditCardId, body }) => updateCreditCard(creditCardId, body),
  mutationKey: ["credit-cards", "update"],
});

export function useUpdateCreditCardMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UpdateCreditCardResult, UpdateCreditCardVariables, TContext>,
) {
  return useAppMutation(updateCreditCardMutationDefinition, options);
}

export const deleteCreditCardMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this credit card. Please try again.",
  mutationFn: deleteCreditCard,
  mutationKey: ["credit-cards", "delete"],
});

export function useDeleteCreditCardMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteCreditCardMutationDefinition, options);
}

type UpdateCreditCardCycleVariables = {
  creditCardId: string;
  cycleId: string;
  body: UpdateCreditCardCycleInput;
};
export const updateCreditCardCycleMutationDefinition = createAppMutationDefinition<
  UpdateCreditCardCycleResult,
  UpdateCreditCardCycleVariables
>({
  defaultErrorMessage: "We couldn't update this billing cycle. Please try again.",
  mutationFn: ({ creditCardId, cycleId, body }) =>
    updateCreditCardCycle(creditCardId, cycleId, body),
  mutationKey: ["credit-cards", "cycles", "update"],
});

export function useUpdateCreditCardCycleMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateCreditCardCycleResult,
    UpdateCreditCardCycleVariables,
    TContext
  >,
) {
  return useAppMutation(updateCreditCardCycleMutationDefinition, options);
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
} from "@/mutations/credit-cards/use-credit-card-transaction-mutations";
