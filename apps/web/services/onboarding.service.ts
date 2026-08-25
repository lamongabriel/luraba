"use client"

import { lurabaApiPassiveClient } from "@/api/luraba-api"
import type { GetOnboardingOptionsHttpResponse } from "@/interfaces/http/onboarding-http"
import { getApiData } from "@/services/api-client.service"

export function getOnboardingOptions(): Promise<GetOnboardingOptionsHttpResponse> {
  return getApiData("/onboarding/options", undefined, lurabaApiPassiveClient)
}
