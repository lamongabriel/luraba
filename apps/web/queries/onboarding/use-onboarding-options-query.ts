"use client"

import { useQuery } from "@tanstack/react-query"

import type { GetOnboardingOptionsHttpResponse } from "@/interfaces/http/onboarding-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { getOnboardingOptions } from "@/services/onboarding.service"

export const onboardingQueryKeys = {
  all: ["onboarding"] as const,
  options: ["onboarding", "options"] as const,
}

export function useOnboardingOptionsQuery<
  TData = GetOnboardingOptionsHttpResponse,
>(options?: AppQueryOptions<GetOnboardingOptionsHttpResponse, TData>) {
  return useQuery({
    queryKey: onboardingQueryKeys.options,
    queryFn: getOnboardingOptions,
    ...options,
  })
}
