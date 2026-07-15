"use client"

import type { ApiResponse } from "@/interfaces/api"
import type {
  GetAuthProvidersHttpResponse,
  GetCurrentUserHttpResponse,
} from "@/interfaces/http/auth-http"
import { lurabaApiClient, lurabaApiPassiveClient } from "@/api/luraba-api"
import { getApiResponseData } from "@/services/error-client"

export async function getAuthProviders(): Promise<GetAuthProvidersHttpResponse> {
  const { data } = await lurabaApiPassiveClient.get<ApiResponse<GetAuthProvidersHttpResponse>>(
    "/auth/providers",
  )

  return getApiResponseData(data)
}

export async function getCurrentUser(): Promise<GetCurrentUserHttpResponse> {
  const { data } = await lurabaApiClient.get<ApiResponse<GetCurrentUserHttpResponse>>(
    "/auth/me",
  )

  return getApiResponseData(data)
}

export async function probeCurrentUser(): Promise<GetCurrentUserHttpResponse> {
  const { data } = await lurabaApiPassiveClient.get<ApiResponse<GetCurrentUserHttpResponse>>(
    "/auth/me",
  )

  return getApiResponseData(data)
}
