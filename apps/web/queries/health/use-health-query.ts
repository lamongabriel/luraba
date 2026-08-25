"use client"

import { useQuery } from "@tanstack/react-query"

import type { GetHealthHttpResponse } from "@/interfaces/http/health-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { getHealth } from "@/services/health.service"

export const healthQueryKeys = {
  all: ["health"] as const,
  status: ["health", "status"] as const,
}

export function useHealthQuery<TData = GetHealthHttpResponse>(
  options?: AppQueryOptions<GetHealthHttpResponse, TData>,
) {
  return useQuery({
    queryKey: healthQueryKeys.status,
    queryFn: getHealth,
    ...options,
  })
}
