"use client"

import { useQuery } from "@tanstack/react-query"
import type {
  ListRecurringBillsHttpQuery,
  ListRecurringBillsHttpResponse,
  ListRecurringOccurrencesHttpQuery,
  ListRecurringOccurrencesHttpResponse,
} from "@/interfaces/http/recurring-bills-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  listRecurringBills,
  listRecurringOccurrences,
} from "@/services/recurring-bills.service"

export const recurringBillQueryKeys = {
  all: ["recurring-bills"] as const,
  list: (query: ListRecurringBillsHttpQuery = {}) =>
    [...recurringBillQueryKeys.all, "list", query] as const,
  occurrences: (id: string, query: ListRecurringOccurrencesHttpQuery) =>
    [...recurringBillQueryKeys.all, id, "occurrences", query] as const,
}
export function useRecurringBillsQuery<TData = ListRecurringBillsHttpResponse>(
  query: ListRecurringBillsHttpQuery = {},
  options?: AppQueryOptions<ListRecurringBillsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: recurringBillQueryKeys.list(query),
    queryFn: () => listRecurringBills(query),
    ...options,
  })
}
export function useRecurringOccurrencesQuery<
  TData = ListRecurringOccurrencesHttpResponse,
>(
  id: string,
  query: ListRecurringOccurrencesHttpQuery,
  options?: AppQueryOptions<ListRecurringOccurrencesHttpResponse, TData>,
) {
  return useQuery({
    queryKey: recurringBillQueryKeys.occurrences(id, query),
    queryFn: () => listRecurringOccurrences(id, query),
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}
