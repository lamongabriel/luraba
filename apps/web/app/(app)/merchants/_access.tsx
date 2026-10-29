"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function MerchantsAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.MERCHANTS_READ}>{children}</PermissionGuard>;
}
