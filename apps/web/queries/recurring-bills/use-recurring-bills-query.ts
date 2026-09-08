"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppQueryOptions } from "@/queries/query-options";
import { listRecurringBills, listRecurringOccurrences } from "@/services/recurring-bills.service";

type ListRecurringBillsQuery = NonNullable<Parameters<typeof listRecurringBills>[0]>;
type ListRecurringBillsResponse = Awaited<ReturnType<typeof listRecurringBills>>;
type ListRecurringOccurrencesQuery = Parameters<typeof listRecurringOccurrences>[1];
type ListRecurringOccurrencesResponse = Awaited<ReturnType<typeof listRecurringOccurrences>>;

export const recurringBillQueryKeys = {
  all: ["recurring-bills"] as const,
  list: (query: ListRecurringBillsQuery = {}) =>
    [...recurringBillQueryKeys.all, "list", query] as const,
  occurrences: (id: string, query: ListRecurringOccurrencesQuery) =>
    [...recurringBillQueryKeys.all, id, "occurrences", query] as const,
};
export function useRecurringBillsQuery<TData = ListRecurringBillsResponse>(
  query: ListRecurringBillsQuery = {},
  options?: AppQueryOptions<ListRecurringBillsResponse, TData>,
) {
  return useQuery({
    queryKey: recurringBillQueryKeys.list(query),
    queryFn: () => listRecurringBills(query),
    ...options,
  });
}
export function useRecurringOccurrencesQuery<TData = ListRecurringOccurrencesResponse>(
  id: string,
  query: ListRecurringOccurrencesQuery,
  options?: AppQueryOptions<ListRecurringOccurrencesResponse, TData>,
) {
  return useQuery({
    queryKey: recurringBillQueryKeys.occurrences(id, query),
    queryFn: () => listRecurringOccurrences(id, query),
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
