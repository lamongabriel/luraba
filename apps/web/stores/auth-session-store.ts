"use client"

import { create } from "zustand"

import { STORAGE_KEYS } from "@/config/storage"
import type { AuthSession } from "@/interfaces/auth"
import type { HouseholdContext, HouseholdSummary } from "@/interfaces/household"
import type { User } from "@/interfaces/user"
import { readStorage, removeStorage, writeStorage } from "@/lib/local-storage"

export type AuthBootstrapStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "anonymous"

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
    const storedHouseholdId = readStorage(STORAGE_KEYS.activeHouseholdId)
    const activeHouseholdId =
      (storedHouseholdId &&
      households.some(({ id }) => id === storedHouseholdId)
        ? storedHouseholdId
        : "") ||
      (session.user.defaultHouseholdId &&
      households.some(({ id }) => id === session.user.defaultHouseholdId)
        ? session.user.defaultHouseholdId
        : "") ||
      session.household?.id ||
      households[0]?.id ||
      ""

    if (activeHouseholdId)
      writeStorage(STORAGE_KEYS.activeHouseholdId, activeHouseholdId)

    set({
      activeHouseholdId,
      bootstrapStatus: "authenticated",
      household: session.household,
      households,
      user: session.user,
    })
  },
  setActiveHouseholdId: (activeHouseholdId) => {
    writeStorage(STORAGE_KEYS.activeHouseholdId, activeHouseholdId)
    set({ activeHouseholdId })
  },
  setBootstrapStatus: (bootstrapStatus) => set({ bootstrapStatus }),
}))
