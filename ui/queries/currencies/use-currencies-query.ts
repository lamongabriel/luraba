"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  GetCurrencyRateHttpQuery,
  GetCurrencyRateHttpResponse,
  ListCurrenciesHttpQuery,
  ListCurrenciesHttpResponse,
} from "@/interfaces/http/currencies-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { getCurrencyRate, listCurrencies } from "@/services/currencies.service"

export const currencyQueryKeys = {
  all: ["currencies"] as const,
  lists: () => [...currencyQueryKeys.all, "list"] as const,
  list: (query: ListCurrenciesHttpQuery = {}) =>
    [...currencyQueryKeys.lists(), query] as const,
  rates: () => [...currencyQueryKeys.all, "rate"] as const,
  rate: (query: GetCurrencyRateHttpQuery) =>
    [...currencyQueryKeys.rates(), query] as const,
}

export function useCurrenciesQuery<TData = ListCurrenciesHttpResponse>(
  query: ListCurrenciesHttpQuery = {},
  options?: AppQueryOptions<ListCurrenciesHttpResponse, TData>,
) {
  return useQuery({
    queryKey: currencyQueryKeys.list(query),
    queryFn: () => listCurrencies(query),
    ...options,
  })
}

export function useCurrencyRateQuery<TData = GetCurrencyRateHttpResponse>(
  query: GetCurrencyRateHttpQuery,
  options?: AppQueryOptions<GetCurrencyRateHttpResponse, TData>,
) {
  return useQuery({
    queryKey: currencyQueryKeys.rate(query),
    queryFn: () => getCurrencyRate(query),
    ...options,
    enabled:
      Boolean(query.fromCurrencyCode && query.toCurrencyCode) &&
      (options?.enabled ?? true),
  })
}
