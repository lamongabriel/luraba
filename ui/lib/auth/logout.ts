"use client"

import { lurabaAuthApiClient } from "@/api/luraba-auth-api"
import { STORAGE_KEYS } from "@/config/storage"
import { removeStorage } from "@/lib/local-storage"
import { queryClient } from "@/lib/query-client"
import { useAuthSessionStore } from "@/stores/auth-session-store"

let logoutPromise: Promise<void> | null = null

async function performLogout(redirectTo = "/login") {
  try {
    await lurabaAuthApiClient.signOut()
  } catch {
    // Sign-out is best-effort; local cleanup still proceeds.
  }

  useAuthSessionStore.getState().clear()
  removeStorage(STORAGE_KEYS.activeHouseholdId)
  queryClient.removeQueries({ queryKey: ["auth"] })
  queryClient.removeQueries({ queryKey: ["households"] })

  if (typeof window !== "undefined") {
    if (window.location.pathname === redirectTo) {
      window.location.reload()
    } else {
      window.location.assign(redirectTo)
    }
  }
}

export async function logout(options: { redirectTo?: string } = {}) {
  if (!logoutPromise) {
    logoutPromise = performLogout(options.redirectTo).finally(() => {
      logoutPromise = null
    })
  }

  await logoutPromise
}
