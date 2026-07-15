"use client"

import type { ApiResponse } from "@/interfaces/api"
import type {
  CreateAccountHttpBody,
  CreateAccountHttpResponse,
  ListAccountsHttpResponse,
} from "@/interfaces/http/accounts-http"
import { lurabaApiClient } from "@/api/luraba-api"
import { getApiResponseData } from "@/services/error-client"

export async function listAccounts(): Promise<ListAccountsHttpResponse> {
  const { data } = await lurabaApiClient.get<ApiResponse<ListAccountsHttpResponse>>(
    "/accounts",
  )

  return getApiResponseData(data)
}

export async function createAccount(
  body: CreateAccountHttpBody,
): Promise<CreateAccountHttpResponse> {
  const { data } = await lurabaApiClient.post<ApiResponse<CreateAccountHttpResponse>>(
    "/accounts",
    body,
  )

  return getApiResponseData(data)
}
