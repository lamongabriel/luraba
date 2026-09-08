"use client";

import { useQuery } from "@tanstack/react-query";

import type { AppQueryOptions } from "@/queries/query-options";
import { getAuthProviders } from "@/services/auth.service";

type AuthProvidersResponse = Awaited<ReturnType<typeof getAuthProviders>>;

export const authQueryKeys = {
  providers: ["auth", "providers"] as const,
  session: ["auth", "session"] as const,
};

export function useAuthProvidersQuery<TData = AuthProvidersResponse>(
  options?: AppQueryOptions<AuthProvidersResponse, TData>,
) {
  return useQuery({
    queryKey: authQueryKeys.providers,
    queryFn: getAuthProviders,
    ...options,
  });
}
