"use client"

import type { ReactNode } from "react"

import { PERMISSIONS, PermissionGuard } from "@/components/permissions"

export function TagsAccess({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.TAGS_READ}>
      {children}
    </PermissionGuard>
  )
}
