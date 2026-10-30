"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function ImportAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.IMPORTS_READ}>{children}</PermissionGuard>;
}
