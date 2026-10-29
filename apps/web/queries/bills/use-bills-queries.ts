"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { getBill, getBillForecast, listBillOccurrences, listBills } from "@/services/bills.service";

type ListBillsQuery = NonNullable<Parameters<typeof listBills>[0]>;
type ListOccurrencesQuery = NonNullable<Parameters<typeof listBillOccurrences>[1]>;
type ForecastQuery = Parameters<typeof getBillForecast>[0];
type ListBillsResponse = Awaited<ReturnType<typeof listBills>>;
type BillResponse = Awaited<ReturnType<typeof getBill>>;
type OccurrencesResponse = Awaited<ReturnType<typeof listBillOccurrences>>;
type ForecastResponse = Awaited<ReturnType<typeof getBillForecast>>;

export const billQueryKeys = {
  all: ["bills"] as const,
  lists: () => [...billQueryKeys.all, "list"] as const,
  list: (query: ListBillsQuery = {}) => [...billQueryKeys.lists(), query] as const,
  details: () => [...billQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...billQueryKeys.details(), id] as const,
  occurrences: (id: string) => [...billQueryKeys.all, "occurrences", id] as const,
  occurrenceList: (id: string, query: ListOccurrencesQuery = {}) =>
    [...billQueryKeys.occurrences(id), query] as const,
  forecasts: () => [...billQueryKeys.all, "forecast"] as const,
  forecast: (query: ForecastQuery) => [...billQueryKeys.forecasts(), query] as const,
};

export function useBillsQuery<TData = ListBillsResponse>(
  query: ListBillsQuery = {},
  options?: AppQueryOptions<ListBillsResponse, TData>,
) {
  return useQuery({
    queryKey: billQueryKeys.list(query),
    queryFn: () => listBills(query),
    ...options,
  });
}

export function useBillQuery<TData = BillResponse>(
  id: string,
  options?: AppQueryOptions<BillResponse, TData>,
) {
  return useQuery({
    queryKey: billQueryKeys.detail(id),
    queryFn: () => getBill(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useBillOccurrencesQuery<TData = OccurrencesResponse>(
  id: string,
  query: ListOccurrencesQuery = {},
  options?: AppQueryOptions<OccurrencesResponse, TData>,
) {
  return useQuery({
    queryKey: billQueryKeys.occurrenceList(id, query),
    queryFn: () => listBillOccurrences(id, query),
    enabled: Boolean(id),
    ...options,
  });
}

export function useBillForecastQuery<TData = ForecastResponse>(
  query: ForecastQuery,
  options?: AppQueryOptions<ForecastResponse, TData>,
) {
  return useQuery({
    queryKey: billQueryKeys.forecast(query),
    queryFn: () => getBillForecast(query),
    ...options,
  });
}
