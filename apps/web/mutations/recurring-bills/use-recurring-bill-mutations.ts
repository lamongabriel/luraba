"use client"

import type {
  CreateRecurringBillHttpBody,
  CreateRecurringBillHttpResponse,
  UpdateRecurringBillHttpBody,
  UpdateRecurringBillHttpResponse,
} from "@/interfaces/http/recurring-bills-http"
import {
  createAppMutationDefinition,
  type UseAppMutationOptions,
  useAppMutation,
} from "@/mutations/app-mutation"
import {
  createRecurringBill,
  createRecurringOccurrence,
  deleteRecurringBill,
  rescheduleRecurringOccurrence,
  skipRecurringOccurrence,
  updateRecurringBill,
} from "@/services/recurring-bills.service"

export const createRecurringBillMutationDefinition =
  createAppMutationDefinition<
    CreateRecurringBillHttpResponse,
    CreateRecurringBillHttpBody
  >({
    defaultErrorMessage: "We couldn't create this recurring rule.",
    mutationFn: createRecurringBill,
    mutationKey: ["recurring-bills", "create"],
  })
export function useCreateRecurringBillMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateRecurringBillHttpResponse,
    CreateRecurringBillHttpBody,
    TContext
  >,
) {
  return useAppMutation(createRecurringBillMutationDefinition, options)
}
type UpdateVariables = { id: string; body: UpdateRecurringBillHttpBody }
export const updateRecurringBillMutationDefinition =
  createAppMutationDefinition<UpdateRecurringBillHttpResponse, UpdateVariables>(
    {
      defaultErrorMessage: "We couldn't update this recurring rule.",
      mutationFn: updateRecurringBill,
      mutationKey: ["recurring-bills", "update"],
    },
  )
export function useUpdateRecurringBillMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateRecurringBillHttpResponse,
    UpdateVariables,
    TContext
  >,
) {
  return useAppMutation(updateRecurringBillMutationDefinition, options)
}
export const deleteRecurringBillMutationDefinition =
  createAppMutationDefinition<void, string>({
    defaultErrorMessage: "We couldn't delete this recurring rule.",
    mutationFn: deleteRecurringBill,
    mutationKey: ["recurring-bills", "delete"],
  })
export function useDeleteRecurringBillMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, string, TContext>,
) {
  return useAppMutation(deleteRecurringBillMutationDefinition, options)
}
type OccurrenceVariables = { id: string; date: string }
export const skipRecurringOccurrenceMutationDefinition =
  createAppMutationDefinition<void, OccurrenceVariables>({
    defaultErrorMessage: "We couldn't skip this occurrence.",
    mutationFn: skipRecurringOccurrence,
    mutationKey: ["recurring-bills", "occurrence", "skip"],
  })
export function useSkipRecurringOccurrenceMutation<TContext = unknown>(
  options?: UseAppMutationOptions<void, OccurrenceVariables, TContext>,
) {
  return useAppMutation(skipRecurringOccurrenceMutationDefinition, options)
}
export const rescheduleRecurringOccurrenceMutationDefinition =
  createAppMutationDefinition<
    void,
    { id: string; date: string; nextDate: string }
  >({
    defaultErrorMessage: "We couldn't reschedule this occurrence.",
    mutationFn: rescheduleRecurringOccurrence,
    mutationKey: ["recurring-bills", "occurrence", "reschedule"],
  })
export function useRescheduleRecurringOccurrenceMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    void,
    { id: string; date: string; nextDate: string },
    TContext
  >,
) {
  return useAppMutation(
    rescheduleRecurringOccurrenceMutationDefinition,
    options,
  )
}
export const createRecurringOccurrenceMutationDefinition =
  createAppMutationDefinition<unknown, OccurrenceVariables>({
    defaultErrorMessage: "We couldn't create this transaction.",
    mutationFn: createRecurringOccurrence,
    mutationKey: ["recurring-bills", "occurrence", "create"],
  })
export function useCreateRecurringOccurrenceMutation<TContext = unknown>(
  options?: UseAppMutationOptions<unknown, OccurrenceVariables, TContext>,
) {
  return useAppMutation(createRecurringOccurrenceMutationDefinition, options)
}
