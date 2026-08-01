"use client"

import type { ReactNode } from "react"

import type { PermissionInput, PermissionMatch } from "./permissions.constants"
import { Unauthorized } from "./unauthorized"
import { useCan } from "./use-can"

interface CanProps {
  permission: PermissionInput
  match?: PermissionMatch
  fallback?: ReactNode
  children: ReactNode
}

export function Can({
  permission,
  match,
  fallback = <Unauthorized fullPage={false} />,
  children,
}: CanProps) {
  const can = useCan()

  return <>{can(permission, match) ? children : fallback}</>
}
