"use client"

import { useQuery } from "@tanstack/react-query"

import type { GetLocationOptionsHttpResponse } from "@/interfaces/http/reference-data-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { getLocationOptions } from "@/services/reference-data.service"

export const referenceDataQueryKeys = {
  all: ["reference-data"] as const,
  locations: ["reference-data", "locations"] as const,
}

export function useLocationOptionsQuery<TData = GetLocationOptionsHttpResponse>(
  options?: AppQueryOptions<GetLocationOptionsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: referenceDataQueryKeys.locations,
    queryFn: getLocationOptions,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  })
}
