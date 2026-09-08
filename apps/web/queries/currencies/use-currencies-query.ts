"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { getCurrencyRate, listCurrencies } from "@/services/currencies.service";

type ListCurrenciesQuery = NonNullable<Parameters<typeof listCurrencies>[0]>;
type ListCurrenciesResponse = Awaited<ReturnType<typeof listCurrencies>>;
type GetCurrencyRateQuery = Parameters<typeof getCurrencyRate>[0];
type GetCurrencyRateResponse = Awaited<ReturnType<typeof getCurrencyRate>>;

export const currencyQueryKeys = {
  all: ["currencies"] as const,
  lists: () => [...currencyQueryKeys.all, "list"] as const,
  list: (query: ListCurrenciesQuery = {}) => [...currencyQueryKeys.lists(), query] as const,
  rates: () => [...currencyQueryKeys.all, "rate"] as const,
  rate: (query: GetCurrencyRateQuery) => [...currencyQueryKeys.rates(), query] as const,
};

export function useCurrenciesQuery<TData = ListCurrenciesResponse>(
  query: ListCurrenciesQuery = {},
  options?: AppQueryOptions<ListCurrenciesResponse, TData>,
) {
  return useQuery({
    queryKey: currencyQueryKeys.list(query),
    queryFn: () => listCurrencies(query),
    ...options,
  });
}

export function useCurrencyRateQuery<TData = GetCurrencyRateResponse>(
  query: GetCurrencyRateQuery,
  options?: AppQueryOptions<GetCurrencyRateResponse, TData>,
) {
  return useQuery({
    queryKey: currencyQueryKeys.rate(query),
    queryFn: () => getCurrencyRate(query),
    ...options,
    enabled: Boolean(query.fromCurrencyCode && query.toCurrencyCode) && (options?.enabled ?? true),
  });
}
