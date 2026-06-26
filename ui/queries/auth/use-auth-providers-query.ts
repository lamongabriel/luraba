"use client"

import { useQuery } from "@tanstack/react-query"

import { getAuthProviders } from "@/services/auth.service"

export const authQueryKeys = {
  providers: ["auth", "providers"] as const,
  session: ["auth", "session"] as const,
}

export function useAuthProvidersQuery() {
  return useQuery({
    queryKey: authQueryKeys.providers,
    queryFn: getAuthProviders,
  })
}
