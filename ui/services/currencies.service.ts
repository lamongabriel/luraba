"use client"

import type { ApiResponse } from "@/interfaces/api"
import type { ListCurrenciesHttpResponse } from "@/interfaces/http/currencies-http"
import { lurabaApiClient } from "@/api/luraba-api"
import { getApiResponseData } from "@/services/error-client"

export async function listCurrencies(): Promise<ListCurrenciesHttpResponse> {
  const { data } = await lurabaApiClient.get<ApiResponse<ListCurrenciesHttpResponse>>(
    "/currencies",
  )

  return getApiResponseData(data)
}
