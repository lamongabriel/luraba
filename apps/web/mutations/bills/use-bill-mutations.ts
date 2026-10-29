"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation";
import { billQueryKeys } from "@/queries/bills/use-bills-queries";
import {
  cancelBill,
  createBill,
  deleteBill,
  linkBillOccurrence,
  markBillOccurrencePaid,
  pauseBill,
  resetBillOccurrence,
  resumeBill,
  skipBillOccurrence,
  updateBill,
} from "@/services/bills.service";

type BillResponse = Awaited<ReturnType<typeof createBill>>;
type CreateBody = Parameters<typeof createBill>[0];
type UpdateVariables = { id: string; body: Parameters<typeof updateBill>[1] };
type OccurrenceResponse = Awaited<ReturnType<typeof markBillOccurrencePaid>>;
type OccurrenceTarget = Parameters<typeof markBillOccurrencePaid>[0];
type LinkVariables = { target: OccurrenceTarget; transactionId: string };

/** Anything that changes a bill or its occurrences can move totals, so refresh all bill data. */
function useInvalidateBills() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: billQueryKeys.all });
}

function withInvalidate<TData, TVariables>(
  invalidate: () => Promise<void>,
  options?: UseAppMutationOptions<TData, TVariables>,
): UseAppMutationOptions<TData, TVariables> {
  return {
    ...options,
    onSuccess: async (...args) => {
      await invalidate();
      await options?.onSuccess?.(...args);
    },
  };
}

export const createBillMutationDefinition = createAppMutationDefinition<BillResponse, CreateBody>({
  defaultErrorMessage: "We couldn't create this bill. Please try again.",
  mutationFn: createBill,
  mutationKey: ["bills", "create"],
});
export function useCreateBillMutation(options?: UseAppMutationOptions<BillResponse, CreateBody>) {
  const invalidate = useInvalidateBills();
  return useAppMutation(createBillMutationDefinition, withInvalidate(invalidate, options));
}

export const updateBillMutationDefinition = createAppMutationDefinition<
  BillResponse,
  UpdateVariables
>({
  defaultErrorMessage: "We couldn't update this bill. Please try again.",
  mutationFn: ({ id, body }) => updateBill(id, body),
  mutationKey: ["bills", "update"],
});
export function useUpdateBillMutation(
  options?: UseAppMutationOptions<BillResponse, UpdateVariables>,
) {
  const invalidate = useInvalidateBills();
  return useAppMutation(updateBillMutationDefinition, withInvalidate(invalidate, options));
}

function statusMutation(
  action: "pause" | "resume" | "cancel",
  mutationFn: (id: string) => Promise<BillResponse>,
  errorMessage: string,
) {
  const definition = createAppMutationDefinition<BillResponse, string>({
    defaultErrorMessage: errorMessage,
    mutationFn,
    mutationKey: ["bills", action],
  });
  return function useStatusMutation(options?: UseAppMutationOptions<BillResponse, string>) {
    const invalidate = useInvalidateBills();
    return useAppMutation(definition, withInvalidate(invalidate, options));
  };
}

export const usePauseBillMutation = statusMutation(
  "pause",
  pauseBill,
  "We couldn't pause this bill. Please try again.",
);
export const useResumeBillMutation = statusMutation(
  "resume",
  resumeBill,
  "We couldn't resume this bill. Please try again.",
);
export const useCancelBillMutation = statusMutation(
  "cancel",
  cancelBill,
  "We couldn't cancel this bill. Please try again.",
);

export const deleteBillMutationDefinition = createAppMutationDefinition<void, string>({
  defaultErrorMessage: "We couldn't delete this bill. Please try again.",
  mutationFn: deleteBill,
  mutationKey: ["bills", "delete"],
});
export function useDeleteBillMutation(options?: UseAppMutationOptions<void, string>) {
  const invalidate = useInvalidateBills();
  return useAppMutation(deleteBillMutationDefinition, withInvalidate(invalidate, options));
}

function occurrenceMutation(
  action: string,
  mutationFn: (target: OccurrenceTarget) => Promise<OccurrenceResponse>,
  errorMessage: string,
) {
  const definition = createAppMutationDefinition<OccurrenceResponse, OccurrenceTarget>({
    defaultErrorMessage: errorMessage,
    mutationFn,
    mutationKey: ["bills", "occurrence", action],
  });
  return function useOccurrenceMutation(
    options?: UseAppMutationOptions<OccurrenceResponse, OccurrenceTarget>,
  ) {
    const invalidate = useInvalidateBills();
    return useAppMutation(definition, withInvalidate(invalidate, options));
  };
}

export const useMarkOccurrencePaidMutation = occurrenceMutation(
  "paid",
  markBillOccurrencePaid,
  "We couldn't mark this payment as paid.",
);
export const useSkipOccurrenceMutation = occurrenceMutation(
  "skip",
  skipBillOccurrence,
  "We couldn't skip this payment.",
);
export const useResetOccurrenceMutation = occurrenceMutation(
  "reset",
  resetBillOccurrence,
  "We couldn't reopen this payment.",
);

export const linkOccurrenceMutationDefinition = createAppMutationDefinition<
  OccurrenceResponse,
  LinkVariables
>({
  defaultErrorMessage: "We couldn't link this transaction.",
  mutationFn: ({ target, transactionId }) => linkBillOccurrence(target, { transactionId }),
  mutationKey: ["bills", "occurrence", "link"],
});
export function useLinkOccurrenceMutation(
  options?: UseAppMutationOptions<OccurrenceResponse, LinkVariables>,
) {
  const invalidate = useInvalidateBills();
  return useAppMutation(linkOccurrenceMutationDefinition, withInvalidate(invalidate, options));
}
