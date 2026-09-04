"use client"
import {
  type CreateRecurringBillInput,
  type CreateRecurringBillResult,
  type CreateRecurringOccurrenceResult,
  type DeleteRecurringBillResult,
  type GetRecurringBillResult,
  type ListRecurringBillsQuery,
  type ListRecurringBillsResult,
  type ListRecurringOccurrencesQuery,
  type ListRecurringOccurrencesResult,
  type RescheduleOccurrenceInput,
  type RescheduleOccurrenceResult,
  recurringBillsEndpoints,
  type SkipOccurrenceResult,
  type UpdateRecurringBillInput,
  type UpdateRecurringBillResult,
} from "@luraba/contracts"
import { requestContract } from "@/services/contract-client.service"

export function listRecurringBills(
  query: ListRecurringBillsQuery = {},
): Promise<ListRecurringBillsResult> {
  return requestContract(recurringBillsEndpoints.list, { query })
}

export function createRecurringBill(
  input: CreateRecurringBillInput,
): Promise<CreateRecurringBillResult> {
  return requestContract(recurringBillsEndpoints.create, { body: input })
}

export function getRecurringBill(id: string): Promise<GetRecurringBillResult> {
  return requestContract(recurringBillsEndpoints.get, { params: { id } })
}

export function updateRecurringBill(
  id: string,
  input: UpdateRecurringBillInput,
): Promise<UpdateRecurringBillResult> {
  return requestContract(recurringBillsEndpoints.update, {
    params: { id },
    body: input,
  })
}

export function deleteRecurringBill(
  id: string,
): Promise<DeleteRecurringBillResult> {
  return requestContract(recurringBillsEndpoints.delete, { params: { id } })
}

export function listRecurringOccurrences(
  id: string,
  query: ListRecurringOccurrencesQuery,
): Promise<ListRecurringOccurrencesResult> {
  return requestContract(recurringBillsEndpoints.occurrences, {
    params: { id },
    query,
  })
}

export function skipRecurringOccurrence(
  id: string,
  date: string,
): Promise<SkipOccurrenceResult> {
  return requestContract(recurringBillsEndpoints.skip, { params: { id, date } })
}

export function rescheduleRecurringOccurrence(
  id: string,
  date: string,
  input: RescheduleOccurrenceInput,
): Promise<RescheduleOccurrenceResult> {
  return requestContract(recurringBillsEndpoints.reschedule, {
    params: { id, date },
    body: input,
  })
}

export function createRecurringOccurrence(
  id: string,
  date: string,
): Promise<CreateRecurringOccurrenceResult> {
  return requestContract(recurringBillsEndpoints.createOccurrence, {
    params: { id, date },
  })
}
