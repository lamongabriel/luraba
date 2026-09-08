"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function AccountsAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.ACCOUNTS_READ}>{children}</PermissionGuard>;
}
