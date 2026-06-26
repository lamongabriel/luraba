"use client"

import type { ApiResponse } from "@/interfaces/api"
import type {
  GetAuthProvidersHttpResponse,
  GetCurrentUserHttpResponse,
} from "@/interfaces/http/auth-http"
import { lurabaApiClient } from "@/api/luraba-api"
import { getApiResponseData } from "@/services/error-client"

export async function getAuthProviders(): Promise<GetAuthProvidersHttpResponse> {
  const { data } = await lurabaApiClient.get<ApiResponse<GetAuthProvidersHttpResponse>>(
    "/auth/providers",
    {
      skipAuthRedirect: true,
    },
  )

  return getApiResponseData(data)
}

export async function getCurrentUser(
  skipAuthRedirect = false,
): Promise<GetCurrentUserHttpResponse> {
  const { data } = await lurabaApiClient.get<ApiResponse<GetCurrentUserHttpResponse>>(
    "/auth/me",
    {
      skipAuthRedirect,
    },
  )

  return getApiResponseData(data)
}
