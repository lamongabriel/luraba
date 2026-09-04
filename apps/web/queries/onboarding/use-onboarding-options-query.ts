"use client"

import { useQuery } from "@tanstack/react-query"

import type { AppQueryOptions } from "@/queries/query-options"
import { getOnboardingOptions } from "@/services/onboarding.service"

type GetOnboardingOptionsResponse = Awaited<
  ReturnType<typeof getOnboardingOptions>
>

export const onboardingQueryKeys = {
  all: ["onboarding"] as const,
  options: ["onboarding", "options"] as const,
}

export function useOnboardingOptionsQuery<TData = GetOnboardingOptionsResponse>(
  options?: AppQueryOptions<GetOnboardingOptionsResponse, TData>,
) {
  return useQuery({
    queryKey: onboardingQueryKeys.options,
    queryFn: getOnboardingOptions,
    ...options,
  })
}
