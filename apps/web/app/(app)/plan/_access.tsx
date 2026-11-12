"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function PlanAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.GOALS_READ}>{children}</PermissionGuard>;
}
