"use client"

import * as React from "react"

import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query"

import type { PermissionInput, PermissionMatch } from "./permissions.constants"

export function useCan() {
  const { data: session } = useCurrentUserQuery()

  const granted = React.useMemo(
    () => new Set(session?.household?.permissions ?? []),
    [session?.household?.permissions],
  )

  return React.useMemo(() => {
    return function can(
      input: PermissionInput,
      match: PermissionMatch = "any",
    ): boolean {
      const permissions = Array.isArray(input) ? input : [input]

      if (permissions.length === 0) return true

      return match === "all"
        ? permissions.every((permission) => granted.has(permission))
        : permissions.some((permission) => granted.has(permission))
    }
  }, [granted])
}
