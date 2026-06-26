"use client"

import { lurabaAuthApiClient } from "@/api/luraba-auth-api"
import { STORAGE_KEYS } from "@/config/storage"
import { queryClient } from "@/lib/query-client"
import { removeStorage } from "@/lib/local-storage"
import { useAuthSessionStore } from "@/stores/auth-session-store"

let logoutPromise: Promise<void> | null = null

async function performLogout() {
  try {
    await lurabaAuthApiClient.signOut()
  } catch {
    // Sign-out is best-effort; local cleanup still proceeds.
  }

  useAuthSessionStore.getState().clear()
  queryClient.removeQueries({ queryKey: ["auth"] })
  queryClient.removeQueries({ queryKey: ["households"] })
  removeStorage(STORAGE_KEYS.activeHouseholdId)

  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login")
  }
}

export async function logout() {
  if (!logoutPromise) {
    logoutPromise = performLogout().finally(() => {
      logoutPromise = null
    })
  }

  await logoutPromise
}
