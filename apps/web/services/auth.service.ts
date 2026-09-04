"use client"
import {
  authEndpoints,
  type GetAuthProvidersResult,
  type GetCurrentUserResult,
  type GetUserPreferencesResult,
  type UpdateUserPreferencesInput,
  type UpdateUserPreferencesResult,
} from "@luraba/contracts"
import type { AxiosInstance } from "axios"
import { lurabaApiClient, lurabaApiPassiveClient } from "@/api/luraba-api"
import { requestContract } from "@/services/contract-client.service"

type AuthRequestOptions = { client?: AxiosInstance }

export function getAuthProviders(): Promise<GetAuthProvidersResult> {
  return requestContract(authEndpoints.providers, {
    client: lurabaApiPassiveClient,
  })
}

export function getCurrentUser(
  options: AuthRequestOptions = {},
): Promise<GetCurrentUserResult> {
  return requestContract(authEndpoints.me, {
    client: options.client ?? lurabaApiClient,
  })
}

export function getUserPreferences(): Promise<GetUserPreferencesResult> {
  return requestContract(authEndpoints.preferences)
}

export function updateUserPreferences(
  input: UpdateUserPreferencesInput,
): Promise<UpdateUserPreferencesResult> {
  return requestContract(authEndpoints.updatePreferences, { body: input })
}
