"use client"

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

type CreateRecurringBillBody = Parameters<typeof createRecurringBill>[0]
type CreateRecurringBillResponse = Awaited<
  ReturnType<typeof createRecurringBill>
>
type UpdateVariables = {
  id: string
  body: Parameters<typeof updateRecurringBill>[1]
}
type UpdateRecurringBillResponse = Awaited<
  ReturnType<typeof updateRecurringBill>
>

export const createRecurringBillMutationDefinition =
  createAppMutationDefinition<
    CreateRecurringBillResponse,
    CreateRecurringBillBody
  >({
    defaultErrorMessage: "We couldn't create this recurring rule.",
    mutationFn: createRecurringBill,
    mutationKey: ["recurring-bills", "create"],
  })
export function useCreateRecurringBillMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    CreateRecurringBillResponse,
    CreateRecurringBillBody,
    TContext
  >,
) {
  return useAppMutation(createRecurringBillMutationDefinition, options)
}
export const updateRecurringBillMutationDefinition =
  createAppMutationDefinition<UpdateRecurringBillResponse, UpdateVariables>({
    defaultErrorMessage: "We couldn't update this recurring rule.",
    mutationFn: ({ id, body }) => updateRecurringBill(id, body),
    mutationKey: ["recurring-bills", "update"],
  })
export function useUpdateRecurringBillMutation<TContext = unknown>(
  options?: UseAppMutationOptions<
    UpdateRecurringBillResponse,
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
    mutationFn: ({ id, date }) => skipRecurringOccurrence(id, date),
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
    mutationFn: ({ id, date, nextDate }) =>
      rescheduleRecurringOccurrence(id, date, { date: nextDate }),
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
    mutationFn: ({ id, date }) => createRecurringOccurrence(id, date),
    mutationKey: ["recurring-bills", "occurrence", "create"],
  })
export function useCreateRecurringOccurrenceMutation<TContext = unknown>(
  options?: UseAppMutationOptions<unknown, OccurrenceVariables, TContext>,
) {
  return useAppMutation(createRecurringOccurrenceMutationDefinition, options)
}
