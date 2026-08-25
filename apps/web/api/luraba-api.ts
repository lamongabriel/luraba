"use client"

import type { AxiosInstance } from "axios"
import axios from "axios"

import { apiConfig } from "@/config/api"
import { STORAGE_KEYS } from "@/config/storage"
import { logout } from "@/lib/auth/logout"
import { readStorage } from "@/lib/local-storage"
import { toAppClientError } from "@/services/error-client"

export function toLurabaApiError(error: unknown) {
  return toAppClientError(error)
}

function createApiClient({
  logoutOnUnauthorized,
}: {
  logoutOnUnauthorized: boolean
}) {
  const client = axios.create({
    baseURL: apiConfig.restBaseUrl,
    withCredentials: true,
  })

  client.interceptors.request.use((config) => {
    const activeHouseholdId = readStorage(STORAGE_KEYS.activeHouseholdId)

    if (activeHouseholdId) {
      config.headers.set("X-Household-Id", activeHouseholdId)
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (
        logoutOnUnauthorized &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        await logout()
      }

      throw toLurabaApiError(error)
    },
  )

  return client
}

export const lurabaApiClient: AxiosInstance = createApiClient({
  logoutOnUnauthorized: true,
})

export const lurabaApiPassiveClient: AxiosInstance = createApiClient({
  logoutOnUnauthorized: false,
})
