"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { splitQueryKeys } from "@/queries/splits/use-splits-queries";
import * as api from "@/services/splits.service";

/** A split's totals depend on all of its installments, so every change refreshes all split data. */
function createSplitMutation<TData, TVariables>(
  name: string,
  errorMessage: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const definition = createAppMutationDefinition<TData, TVariables>({
    defaultErrorMessage: errorMessage,
    mutationFn,
    mutationKey: ["splits", name],
  });

  return function useSplitMutation(options?: UseAppMutationOptions<TData, TVariables>) {
    const queryClient = useQueryClient();
    return useAppMutation(definition, {
      ...options,
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({ queryKey: splitQueryKeys.all });
        await options?.onSuccess?.(...args);
      },
    });
  };
}

export const useCreateSplitMutation = createSplitMutation(
  "create",
  "We couldn't create this split. Please try again.",
  api.createSplit,
);
export const useUpdateSplitMutation = createSplitMutation(
  "update",
  "We couldn't update this split. Please try again.",
  ({ id, body }: { id: string; body: Parameters<typeof api.updateSplit>[1] }) =>
    api.updateSplit(id, body),
);
export const useDeleteSplitMutation = createSplitMutation(
  "delete",
  "We couldn't delete this split. Please try again.",
  api.deleteSplit,
);
export const useAddParticipantMutation = createSplitMutation(
  "add-participant",
  "We couldn't add this person. Please try again.",
  ({ id, body }: { id: string; body: Parameters<typeof api.addParticipant>[1] }) =>
    api.addParticipant(id, body),
);
export const useRemoveParticipantMutation = createSplitMutation(
  "remove-participant",
  "We couldn't remove this person. Please try again.",
  api.removeParticipant,
);
export const useAddInstallmentsMutation = createSplitMutation(
  "add-installments",
  "We couldn't add these installments. Please try again.",
  ({
    target,
    body,
  }: {
    target: api.ParticipantTarget;
    body: Parameters<typeof api.addInstallments>[1];
  }) => api.addInstallments(target, body),
);
export const useUpdateInstallmentMutation = createSplitMutation(
  "update-installment",
  "We couldn't update this installment. Please try again.",
  ({
    target,
    body,
  }: {
    target: api.InstallmentTarget;
    body: Parameters<typeof api.updateInstallment>[1];
  }) => api.updateInstallment(target, body),
);
export const useRemoveInstallmentMutation = createSplitMutation(
  "remove-installment",
  "We couldn't remove this installment. Please try again.",
  api.removeInstallment,
);
export const useLinkInstallmentMutation = createSplitMutation(
  "link-installment",
  "We couldn't link this transaction.",
  ({ target, transactionId }: { target: api.InstallmentTarget; transactionId: string }) =>
    api.linkInstallment(target, transactionId),
);
export const useReceiveInstallmentMutation = createSplitMutation(
  "receive-installment",
  "We couldn't mark this as received.",
  api.receiveInstallment,
);
export const useSkipInstallmentMutation = createSplitMutation(
  "skip-installment",
  "We couldn't skip this installment.",
  api.skipInstallment,
);
export const useWriteOffInstallmentMutation = createSplitMutation(
  "write-off-installment",
  "We couldn't write this installment off.",
  api.writeOffInstallment,
);
export const useResetInstallmentMutation = createSplitMutation(
  "reset-installment",
  "We couldn't reopen this installment.",
  api.resetInstallment,
);
