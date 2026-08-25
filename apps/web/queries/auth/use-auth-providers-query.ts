"use client"

import { useQuery } from "@tanstack/react-query"

import type { GetAuthProvidersHttpResponse } from "@/interfaces/http/auth-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { getAuthProviders } from "@/services/auth.service"

export const authQueryKeys = {
  providers: ["auth", "providers"] as const,
  session: ["auth", "session"] as const,
}

export function useAuthProvidersQuery<TData = GetAuthProvidersHttpResponse>(
  options?: AppQueryOptions<GetAuthProvidersHttpResponse, TData>,
) {
  return useQuery({
    queryKey: authQueryKeys.providers,
    queryFn: getAuthProviders,
    ...options,
  })
}
