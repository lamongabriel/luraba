"use client"

import { useQuery } from "@tanstack/react-query"

import type { GetCurrentUserHttpResponse } from "@/interfaces/http/auth-http"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"
import type { AppQueryOptions } from "@/queries/query-options"
import { getCurrentUser, probeCurrentUser } from "@/services/auth.service"

export function useCurrentUserQuery<TData = GetCurrentUserHttpResponse>(
  options?: AppQueryOptions<GetCurrentUserHttpResponse, TData>,
) {
  return useQuery({
    queryKey: authQueryKeys.session,
    queryFn: getCurrentUser,
    ...options,
  })
}

export function useProbeCurrentUserQuery<TData = GetCurrentUserHttpResponse>(
  options?: AppQueryOptions<GetCurrentUserHttpResponse, TData>,
) {
  return useQuery({
    queryKey: [...authQueryKeys.session, "probe"] as const,
    queryFn: probeCurrentUser,
    ...options,
  })
}
