"use client"

import type { ApiResponse } from "@/interfaces/api"
import type { ListHouseholdsHttpResponse } from "@/interfaces/http/households-http"
import { lurabaApiClient, lurabaApiPassiveClient } from "@/api/luraba-api"
import { getApiResponseData } from "@/services/error-client"

export async function listHouseholds(): Promise<ListHouseholdsHttpResponse> {
  const { data } = await lurabaApiClient.get<ApiResponse<ListHouseholdsHttpResponse>>(
    "/households",
  )

  return getApiResponseData(data)
}

export async function probeHouseholds(): Promise<ListHouseholdsHttpResponse> {
  const { data } = await lurabaApiPassiveClient.get<ApiResponse<ListHouseholdsHttpResponse>>(
    "/households",
  )

  return getApiResponseData(data)
}
