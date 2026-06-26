"use client"

import type { ApiResponse } from "@/interfaces/api"
import type { ListHouseholdsHttpResponse } from "@/interfaces/http/households-http"
import { lurabaApiClient } from "@/api/luraba-api"
import { getApiResponseData } from "@/services/error-client"

export async function listHouseholds(
  skipAuthRedirect = false,
): Promise<ListHouseholdsHttpResponse> {
  const { data } = await lurabaApiClient.get<ApiResponse<ListHouseholdsHttpResponse>>(
    "/households",
    {
      skipAuthRedirect,
    },
  )

  return getApiResponseData(data)
}
