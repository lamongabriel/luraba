"use client"

import {
  queryOptions,
  useQuery,
} from "@tanstack/react-query"

import { listCurrencies } from "@/services/currencies.service"

export const currencyQueryKeys = {
  list: ["currencies"] as const,
}

export function getCurrenciesQueryOptions() {
  return queryOptions({
    queryKey: currencyQueryKeys.list,
    queryFn: () => listCurrencies(),
  })
}

export function useCurrenciesQuery(enabled = true) {
  return useQuery({
    ...getCurrenciesQueryOptions(),
    enabled,
  })
}
