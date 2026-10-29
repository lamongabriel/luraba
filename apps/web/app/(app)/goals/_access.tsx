"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function GoalsAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.GOALS_READ}>{children}</PermissionGuard>;
}
