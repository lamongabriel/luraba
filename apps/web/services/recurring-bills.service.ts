"use client"

import type {
  CreateRecurringBillHttpBody,
  CreateRecurringBillHttpResponse,
  ListRecurringBillsHttpQuery,
  ListRecurringBillsHttpResponse,
  ListRecurringOccurrencesHttpQuery,
  ListRecurringOccurrencesHttpResponse,
  UpdateRecurringBillHttpBody,
  UpdateRecurringBillHttpResponse,
} from "@/interfaces/http/recurring-bills-http"
import {
  deleteApiResource,
  getApiData,
  getApiList,
  patchApiData,
  postApiData,
  postApiResource,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listRecurringBills(
  query: ListRecurringBillsHttpQuery = {},
): Promise<ListRecurringBillsHttpResponse> {
  return getApiList("/recurring-bills", { params: serializeHttpQuery(query) })
}
export function createRecurringBill(
  body: CreateRecurringBillHttpBody,
): Promise<CreateRecurringBillHttpResponse> {
  return postApiData("/recurring-bills", body)
}
export function updateRecurringBill({
  id,
  body,
}: {
  id: string
  body: UpdateRecurringBillHttpBody
}): Promise<UpdateRecurringBillHttpResponse> {
  return patchApiData(`/recurring-bills/${id}`, body)
}
export function deleteRecurringBill(id: string): Promise<void> {
  return deleteApiResource(`/recurring-bills/${id}`)
}
export function listRecurringOccurrences(
  id: string,
  query: ListRecurringOccurrencesHttpQuery,
): Promise<ListRecurringOccurrencesHttpResponse> {
  return getApiData(`/recurring-bills/${id}/occurrences`, {
    params: serializeHttpQuery(query),
  })
}
export function skipRecurringOccurrence({
  id,
  date,
}: {
  id: string
  date: string
}): Promise<void> {
  return postApiResource(`/recurring-bills/${id}/occurrences/${date}/skip`)
}
export function rescheduleRecurringOccurrence({
  id,
  date,
  nextDate,
}: {
  id: string
  date: string
  nextDate: string
}): Promise<void> {
  return postApiResource(
    `/recurring-bills/${id}/occurrences/${date}/reschedule`,
    { date: nextDate },
  )
}
export function createRecurringOccurrence({
  id,
  date,
}: {
  id: string
  date: string
}) {
  return postApiData(`/recurring-bills/${id}/occurrences/${date}/create`)
}
