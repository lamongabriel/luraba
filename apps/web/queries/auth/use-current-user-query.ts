"use client"

import { useQuery } from "@tanstack/react-query"

import { lurabaApiPassiveClient } from "@/api/luraba-api"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"
import type { AppQueryOptions } from "@/queries/query-options"
import { getCurrentUser } from "@/services/auth.service"

type CurrentUserResponse = Awaited<ReturnType<typeof getCurrentUser>>

export function useCurrentUserQuery<TData = CurrentUserResponse>(
  options?: AppQueryOptions<CurrentUserResponse, TData>,
) {
  return useQuery({
    queryKey: authQueryKeys.session,
    queryFn: () => getCurrentUser(),
    ...options,
  })
}

export function useProbeCurrentUserQuery<TData = CurrentUserResponse>(
  options?: AppQueryOptions<CurrentUserResponse, TData>,
) {
  return useQuery({
    queryKey: [...authQueryKeys.session, "probe"] as const,
    queryFn: () => getCurrentUser({ client: lurabaApiPassiveClient }),
    ...options,
  })
}
