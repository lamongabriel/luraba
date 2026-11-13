"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function BudgetsAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.BUDGETS_READ}>{children}</PermissionGuard>;
}
