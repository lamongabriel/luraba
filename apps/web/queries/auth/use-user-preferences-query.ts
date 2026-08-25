"use client"

import { useQuery } from "@tanstack/react-query"

import type { GetUserPreferencesHttpResponse } from "@/interfaces/http/auth-http"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"
import type { AppQueryOptions } from "@/queries/query-options"
import { getUserPreferences } from "@/services/auth.service"

export function useUserPreferencesQuery<TData = GetUserPreferencesHttpResponse>(
  options?: AppQueryOptions<GetUserPreferencesHttpResponse, TData>,
) {
  return useQuery({
    queryKey: [...authQueryKeys.session, "preferences"] as const,
    queryFn: getUserPreferences,
    ...options,
  })
}
