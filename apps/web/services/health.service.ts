"use client"

import axios from "axios"

import { apiConfig } from "@/config/api"
import type { ApiResponse } from "@/interfaces/api"
import type { GetHealthHttpResponse } from "@/interfaces/http/health-http"
import { getApiResponseData } from "@/services/error-client"

export async function getHealth(): Promise<GetHealthHttpResponse> {
  const response = await axios.get<ApiResponse<GetHealthHttpResponse>>(
    `${apiConfig.origin}/health`,
  )
  return getApiResponseData(response.data)
}
