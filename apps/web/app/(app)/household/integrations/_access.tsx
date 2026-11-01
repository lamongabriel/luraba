"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function IntegrationsAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.INTEGRATIONS_READ}>{children}</PermissionGuard>;
}
