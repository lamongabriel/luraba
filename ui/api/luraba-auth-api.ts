"use client"

import { createAuthClient } from "better-auth/react"
import { apiConfig } from "@/config/api"

export const lurabaAuthApiClient = createAuthClient({
  baseURL: apiConfig.authBaseUrl,
  fetchOptions: {
    credentials: "include",
  },
})
