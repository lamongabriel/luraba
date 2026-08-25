"use client"

import type { ReactNode } from "react"

import { PERMISSIONS, PermissionGuard } from "@/components/permissions"

export function DashboardAccess({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.HOUSEHOLD_READ}>
      {children}
    </PermissionGuard>
  )
}
