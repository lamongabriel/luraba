"use client"

import { lurabaApiClient, lurabaApiPassiveClient } from "@/api/luraba-api"
import type { ApiResponse } from "@/interfaces/api"
import type {
  GetAuthProvidersHttpResponse,
  GetCurrentUserHttpResponse,
  GetUserPreferencesHttpResponse,
  UpdateUserPreferencesHttpBody,
  UpdateUserPreferencesHttpResponse,
} from "@/interfaces/http/auth-http"
import { getApiResponseData } from "@/services/error-client"

export async function getAuthProviders(): Promise<GetAuthProvidersHttpResponse> {
  const { data } =
    await lurabaApiPassiveClient.get<ApiResponse<GetAuthProvidersHttpResponse>>(
      "/auth/providers",
    )

  return getApiResponseData(data)
}

export async function getCurrentUser(): Promise<GetCurrentUserHttpResponse> {
  const { data } =
    await lurabaApiClient.get<ApiResponse<GetCurrentUserHttpResponse>>(
      "/auth/me",
    )

  return getApiResponseData(data)
}

export async function probeCurrentUser(): Promise<GetCurrentUserHttpResponse> {
  const { data } =
    await lurabaApiPassiveClient.get<ApiResponse<GetCurrentUserHttpResponse>>(
      "/auth/me",
    )

  return getApiResponseData(data)
}

export async function getUserPreferences(): Promise<GetUserPreferencesHttpResponse> {
  const { data } = await lurabaApiClient.get<
    ApiResponse<GetUserPreferencesHttpResponse>
  >("/auth/me/preferences")

  return getApiResponseData(data)
}

export async function updateUserPreferences(
  body: UpdateUserPreferencesHttpBody,
): Promise<UpdateUserPreferencesHttpResponse> {
  const { data } = await lurabaApiClient.patch<
    ApiResponse<UpdateUserPreferencesHttpResponse>
  >("/auth/me/preferences", body)

  return getApiResponseData(data)
}
