"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function SplitsAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.SPLITS_READ}>{children}</PermissionGuard>;
}
