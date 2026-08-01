"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  ListMerchantsHttpQuery,
  ListMerchantsHttpResponse,
} from "@/interfaces/http/merchants-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { listMerchants } from "@/services/merchants.service"

export const merchantQueryKeys = {
  all: ["merchants"] as const,
  lists: () => [...merchantQueryKeys.all, "list"] as const,
  list: (query: ListMerchantsHttpQuery = {}) =>
    [...merchantQueryKeys.lists(), query] as const,
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
