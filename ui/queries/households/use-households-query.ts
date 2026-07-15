"use client"

import {
  queryOptions,
  useQuery,
} from "@tanstack/react-query"

import { listHouseholds, probeHouseholds } from "@/services/households.service"

export const householdQueryKeys = {
  list: ["households"] as const,
}

export function getHouseholdsQueryOptions() {
  return queryOptions({
    queryKey: householdQueryKeys.list,
    queryFn: () => listHouseholds(),
  })
}

export function getProbeHouseholdsQueryOptions() {
  return queryOptions({
    queryKey: [...householdQueryKeys.list, "probe"] as const,
    queryFn: () => probeHouseholds(),
  })
}

export function useHouseholdsQuery(enabled = true) {
  return useQuery({
    ...getHouseholdsQueryOptions(),
    enabled,
  })
}

export function useProbeHouseholdsQuery(enabled = true) {
  return useQuery({
    ...getProbeHouseholdsQueryOptions(),
    enabled,
  })
}
