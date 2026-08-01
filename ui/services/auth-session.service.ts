"use client"

import type { AuthSession } from "@/interfaces/auth"
import type { HouseholdSummary } from "@/interfaces/household"
import { queryClient } from "@/lib/query-client"
import { authQueryKeys } from "@/queries/auth/use-auth-providers-query"
import { householdQueryKeys } from "@/queries/households/use-households-query"
import { getCurrentUser } from "@/services/auth.service"
import { listHouseholds } from "@/services/households.service"

interface HydrateAuthenticatedSessionOptions {
  hydrate: (session: AuthSession, households: HouseholdSummary[]) => void
}

export async function hydrateAuthenticatedSession(
  options: HydrateAuthenticatedSessionOptions,
) {
  const [session, households] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: authQueryKeys.session,
      queryFn: getCurrentUser,
    }),
    queryClient.fetchQuery({
      queryKey: householdQueryKeys.list(),
      queryFn: () => listHouseholds(),
    }),
  ])

  options.hydrate(session, households.data)

  return {
    households: households.data,
    session,
  }
}
