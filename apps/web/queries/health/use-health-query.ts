"use client"

import { useQuery } from "@tanstack/react-query"

import type { AppQueryOptions } from "@/queries/query-options"
import { getHealth } from "@/services/health.service"

type GetHealthResponse = Awaited<ReturnType<typeof getHealth>>

export const healthQueryKeys = {
  all: ["health"] as const,
  status: ["health", "status"] as const,
}

export function useHealthQuery<TData = GetHealthResponse>(
  options?: AppQueryOptions<GetHealthResponse, TData>,
) {
  return useQuery({
    queryKey: healthQueryKeys.status,
    queryFn: getHealth,
    ...options,
  })
}
