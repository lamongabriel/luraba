"use client";

import type {
  CardStatementInput,
  CardStatementResult,
  CreateCreditCardInput,
  CreateCreditCardResult,
  ReconcileCycleInput,
  ReconcileCycleResult,
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
  applyCardStatement,
  createCreditCard,
  deleteCreditCard,
  previewCardStatement,
  reconcileCreditCardCycle,
  setCreditCardArchived,
  unreconcileCreditCardCycle,
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

type SetCreditCardArchivedVariables = { id: string; archived: boolean };

export const setCreditCardArchivedMutationDefinition = createAppMutationDefinition<
  UpdateCreditCardResult,
  SetCreditCardArchivedVariables
>({
  defaultErrorMessage: "We couldn't change this credit card. Please try again.",
  mutationFn: ({ id, archived }) => setCreditCardArchived(id, archived),
  mutationKey: ["credit-cards", "archive"],
});

export function useSetCreditCardArchivedMutation<TContext = unknown>(
  options?: UseAppMutationOptions<UpdateCreditCardResult, SetCreditCardArchivedVariables, TContext>,
) {
  return useAppMutation(setCreditCardArchivedMutationDefinition, options);
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

type StatementVariables = { creditCardId: string; body: CardStatementInput };

export const previewCardStatementMutationDefinition = createAppMutationDefinition<
  CardStatementResult,
  StatementVariables
>({
  defaultErrorMessage: "We couldn't read this statement. Check the file and month, then try again.",
  mutationFn: ({ creditCardId, body }) => previewCardStatement(creditCardId, body),
  mutationKey: ["credit-cards", "statements", "preview"],
});

export function usePreviewCardStatementMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CardStatementResult, StatementVariables, TContext>,
) {
  return useAppMutation(previewCardStatementMutationDefinition, options);
}

export const applyCardStatementMutationDefinition = createAppMutationDefinition<
  CardStatementResult,
  StatementVariables
>({
  defaultErrorMessage: "We couldn't apply this statement. Please try again.",
  mutationFn: ({ creditCardId, body }) => applyCardStatement(creditCardId, body),
  mutationKey: ["credit-cards", "statements", "apply"],
});

export function useApplyCardStatementMutation<TContext = unknown>(
  options?: UseAppMutationOptions<CardStatementResult, StatementVariables, TContext>,
) {
  return useAppMutation(applyCardStatementMutationDefinition, options);
}

type ReconcileVariables = { creditCardId: string; body: ReconcileCycleInput };

export const reconcileCycleMutationDefinition = createAppMutationDefinition<
  ReconcileCycleResult,
  ReconcileVariables
>({
  defaultErrorMessage: "We couldn't reconcile this invoice. Please try again.",
  mutationFn: ({ creditCardId, body }) => reconcileCreditCardCycle(creditCardId, body),
  mutationKey: ["credit-cards", "cycles", "reconcile"],
});

export function useReconcileCycleMutation<TContext = unknown>(
  options?: UseAppMutationOptions<ReconcileCycleResult, ReconcileVariables, TContext>,
) {
  return useAppMutation(reconcileCycleMutationDefinition, options);
}

type UnreconcileVariables = { creditCardId: string; cycleId: string };

export const unreconcileCycleMutationDefinition = createAppMutationDefinition<
  Awaited<ReturnType<typeof unreconcileCreditCardCycle>>,
  UnreconcileVariables
>({
  defaultErrorMessage: "We couldn't unlock this invoice. Please try again.",
  mutationFn: ({ creditCardId, cycleId }) => unreconcileCreditCardCycle(creditCardId, cycleId),
  mutationKey: ["credit-cards", "cycles", "unreconcile"],
});

export function useUnreconcileCycleMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    Awaited<ReturnType<typeof unreconcileCreditCardCycle>>,
    UnreconcileVariables,
    TContext
  >,
) {
  return useAppMutation(unreconcileCycleMutationDefinition, options);
}
