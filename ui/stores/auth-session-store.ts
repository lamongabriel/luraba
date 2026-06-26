"use client"

import { create } from "zustand"

import { STORAGE_KEYS } from "@/config/storage"
import type { AuthSession } from "@/interfaces/auth"
import type { HouseholdContext, HouseholdSummary } from "@/interfaces/household"
import type { User } from "@/interfaces/user"
import { readStorage, removeStorage, writeStorage } from "@/lib/local-storage"

export type AuthBootstrapStatus = "idle" | "loading" | "authenticated" | "anonymous"

function resolveActiveHouseholdId(
  session: AuthSession,
  households: HouseholdSummary[],
) {
  const storedHouseholdId = readStorage(STORAGE_KEYS.activeHouseholdId)

  if (storedHouseholdId && households.some((household) => household.id === storedHouseholdId)) {
    return storedHouseholdId
  }

  if (
    session.user.defaultHouseholdId &&
    households.some((household) => household.id === session.user.defaultHouseholdId)
  ) {
    return session.user.defaultHouseholdId
  }

  return session.household.id
}

type AuthSessionState = {
  activeHouseholdId: string
  bootstrapStatus: AuthBootstrapStatus
  household: HouseholdContext | null
  households: HouseholdSummary[]
  user: User | null
  clear: () => void
  hydrate: (session: AuthSession, households: HouseholdSummary[]) => void
  setActiveHouseholdId: (householdId: string) => void
  setBootstrapStatus: (status: AuthBootstrapStatus) => void
}

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  activeHouseholdId: readStorage(STORAGE_KEYS.activeHouseholdId),
  bootstrapStatus: "idle",
  household: null,
  households: [],
  user: null,
  clear: () => {
    removeStorage(STORAGE_KEYS.activeHouseholdId)

    set({
      activeHouseholdId: "",
      bootstrapStatus: "anonymous",
      household: null,
      households: [],
      user: null,
    })
  },
  hydrate: (session, households) => {
    const activeHouseholdId = resolveActiveHouseholdId(session, households)

    writeStorage(STORAGE_KEYS.activeHouseholdId, activeHouseholdId)

    set({
      activeHouseholdId,
      bootstrapStatus: "authenticated",
      household: session.household,
      households,
      user: session.user,
    })
  },
  setActiveHouseholdId: (householdId) => {
    writeStorage(STORAGE_KEYS.activeHouseholdId, householdId)

    set({
      activeHouseholdId: householdId,
    })
  },
  setBootstrapStatus: (bootstrapStatus) => set({ bootstrapStatus }),
}))
