"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function ExportAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.EXPORTS_READ}>{children}</PermissionGuard>;
}
