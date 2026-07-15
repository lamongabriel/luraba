"use client"

import {
  queryOptions,
  useQuery,
} from "@tanstack/react-query"

import { getCurrentUser, probeCurrentUser } from "@/services/auth.service"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"

export function getCurrentUserQueryOptions() {
  return queryOptions({
    queryKey: authQueryKeys.session,
    queryFn: () => getCurrentUser(),
  })
}

export function getProbeCurrentUserQueryOptions() {
  return queryOptions({
    queryKey: [...authQueryKeys.session, "probe"] as const,
    queryFn: () => probeCurrentUser(),
  })
}

export function useCurrentUserQuery(enabled = true) {
  return useQuery({
    ...getCurrentUserQueryOptions(),
    enabled,
  })
}

export function useProbeCurrentUserQuery(enabled = true) {
  return useQuery({
    ...getProbeCurrentUserQueryOptions(),
    enabled,
  })
}
