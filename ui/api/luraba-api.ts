"use client"

import axios from "axios"

import { apiConfig } from "@/config/api"
import { STORAGE_KEYS } from "@/config/storage"
import { logout } from "@/lib/auth/logout"
import { readStorage } from "@/lib/local-storage"
import { toAppClientError } from "@/services/error-client"

declare module "axios" {
  interface AxiosRequestConfig<D = any> {
    skipAuthRedirect?: boolean
  }

  interface InternalAxiosRequestConfig<D = any> {
    skipAuthRedirect?: boolean
  }
}

function getActiveHouseholdId() {
  return readStorage(STORAGE_KEYS.activeHouseholdId)
}

export function toLurabaApiError(error: unknown) {
  return toAppClientError(error)
}

export const lurabaApiClient = axios.create({
  baseURL: apiConfig.restBaseUrl,
  withCredentials: true,
})

lurabaApiClient.interceptors.request.use((config) => {
  const activeHouseholdId = getActiveHouseholdId()

  if (activeHouseholdId) {
    config.headers.set("X-Household-Id", activeHouseholdId)
  }

  return config
})

lurabaApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.skipAuthRedirect
    ) {
      await logout()
    }

    throw toLurabaApiError(error)
  },
)
