"use client"

import {
  queryOptions,
  useQuery,
} from "@tanstack/react-query"

import { getCurrentUser } from "@/services/auth.service"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"

export function getCurrentUserQueryOptions(skipAuthRedirect = false) {
  return queryOptions({
    queryKey: authQueryKeys.session,
    queryFn: () => getCurrentUser(skipAuthRedirect),
  })
}

export function useCurrentUserQuery(skipAuthRedirect = false) {
  return useQuery(getCurrentUserQueryOptions(skipAuthRedirect))
}
