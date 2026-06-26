"use client"

import type { AuthSession } from "@/interfaces/auth"
import type { HouseholdSummary } from "@/interfaces/household"
import { queryClient } from "@/lib/query-client"
import {
  getCurrentUserQueryOptions,
} from "@/queries/auth/use-current-user-query"
import { getHouseholdsQueryOptions } from "@/queries/households/use-households-query"

interface HydrateAuthenticatedSessionOptions {
  hydrate: (session: AuthSession, households: HouseholdSummary[]) => void
}

export async function hydrateAuthenticatedSession(
  options: HydrateAuthenticatedSessionOptions,
) {
  const [session, households] = await Promise.all([
    queryClient.fetchQuery(getCurrentUserQueryOptions()),
    queryClient.fetchQuery(getHouseholdsQueryOptions()),
  ])

  options.hydrate(session, households)

  return {
    households,
    session,
  }
}
