"use client"

import type { ReactNode } from "react"

import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query"

import type { PermissionInput, PermissionMatch } from "./permissions.constants"
import { Unauthorized } from "./unauthorized"
import { useCan } from "./use-can"

interface PermissionGuardProps {
  permission: PermissionInput
  match?: PermissionMatch
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function PermissionGuard({
  permission,
  match,
  title,
  description,
  backHref,
  backLabel,
  children,
}: PermissionGuardProps) {
  const { isPending } = useCurrentUserQuery()
  const can = useCan()

  if (isPending) return null
  if (can(permission, match)) return <>{children}</>

  return (
    <Unauthorized
      title={title}
      description={description}
      backHref={backHref}
      backLabel={backLabel}
    />
  )
}
