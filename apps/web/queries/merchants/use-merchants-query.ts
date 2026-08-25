"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  GetMerchantHttpResponse,
  ListMerchantsHttpQuery,
  ListMerchantsHttpResponse,
} from "@/interfaces/http/merchants-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { getMerchant, listMerchants } from "@/services/merchants.service"

export const merchantQueryKeys = {
  all: ["merchants"] as const,
  lists: () => [...merchantQueryKeys.all, "list"] as const,
  list: (query: ListMerchantsHttpQuery = {}) =>
    [...merchantQueryKeys.lists(), query] as const,
  details: () => [...merchantQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...merchantQueryKeys.details(), id] as const,
}

export function useMerchantQuery<TData = GetMerchantHttpResponse>(
  id: string,
  options?: AppQueryOptions<GetMerchantHttpResponse, TData>,
) {
  return useQuery({
    queryKey: merchantQueryKeys.detail(id),
    queryFn: () => getMerchant(id),
    ...options,
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}

export function useMerchantsQuery<TData = ListMerchantsHttpResponse>(
  query: ListMerchantsHttpQuery = {},
  options?: AppQueryOptions<ListMerchantsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: merchantQueryKeys.list(query),
    queryFn: () => listMerchants(query),
    ...options,
  })
}
