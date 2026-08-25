"use client"

import type { ReactNode } from "react"

import { PERMISSIONS, PermissionGuard } from "@/components/permissions"

export function TransactionsAccess({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.TRANSACTIONS_READ}>
      {children}
    </PermissionGuard>
  )
}
