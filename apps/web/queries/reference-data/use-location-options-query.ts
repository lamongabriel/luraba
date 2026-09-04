"use client"

import { useQuery } from "@tanstack/react-query"

import type { AppQueryOptions } from "@/queries/query-options"
import { getLocationOptions } from "@/services/reference-data.service"

type GetLocationOptionsResponse = Awaited<ReturnType<typeof getLocationOptions>>

export const referenceDataQueryKeys = {
  all: ["reference-data"] as const,
  locations: ["reference-data", "locations"] as const,
}

export function useLocationOptionsQuery<TData = GetLocationOptionsResponse>(
  options?: AppQueryOptions<GetLocationOptionsResponse, TData>,
) {
  return useQuery({
    queryKey: referenceDataQueryKeys.locations,
    queryFn: getLocationOptions,
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  })
}
