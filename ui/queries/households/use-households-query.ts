"use client"

import {
  queryOptions,
  useQuery,
} from "@tanstack/react-query"

import { listHouseholds } from "@/services/households.service"

export const householdQueryKeys = {
  list: ["households"] as const,
}

export function getHouseholdsQueryOptions(skipAuthRedirect = false) {
  return queryOptions({
    queryKey: householdQueryKeys.list,
    queryFn: () => listHouseholds(skipAuthRedirect),
  })
}

export function useHouseholdsQuery(
  enabled = true,
  skipAuthRedirect = false,
) {
  return useQuery({
    ...getHouseholdsQueryOptions(skipAuthRedirect),
    enabled,
  })
}
