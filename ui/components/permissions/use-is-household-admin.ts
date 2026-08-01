"use client"

import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query"

export function useIsHouseholdAdmin() {
  const { data: session } = useCurrentUserQuery()
  const role = session?.household?.role

  return role === "owner" || role === "admin"
}
