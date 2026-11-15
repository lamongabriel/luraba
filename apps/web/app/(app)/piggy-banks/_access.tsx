"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function PiggyBanksAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.PIGGY_BANKS_READ}>{children}</PermissionGuard>;
}
