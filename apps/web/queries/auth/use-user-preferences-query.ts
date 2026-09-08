"use client";

import { useQuery } from "@tanstack/react-query";

import { authQueryKeys } from "@/queries/auth/use-auth-providers-query";
import type { AppQueryOptions } from "@/queries/query-options";
import { getUserPreferences } from "@/services/auth.service";

type UserPreferencesResponse = Awaited<ReturnType<typeof getUserPreferences>>;

export function useUserPreferencesQuery<TData = UserPreferencesResponse>(
  options?: AppQueryOptions<UserPreferencesResponse, TData>,
) {
  return useQuery({
    queryKey: [...authQueryKeys.session, "preferences"] as const,
    queryFn: getUserPreferences,
    ...options,
  });
}
