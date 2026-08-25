"use client"

import { lurabaApiPassiveClient } from "@/api/luraba-api"
import type { GetLocationOptionsHttpResponse } from "@/interfaces/http/reference-data-http"
import { getApiData } from "@/services/api-client.service"

export function getLocationOptions(): Promise<GetLocationOptionsHttpResponse> {
  return getApiData(
    "/reference-data/locations",
    undefined,
    lurabaApiPassiveClient,
  )
}
