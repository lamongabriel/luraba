"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function MembersAccess({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.HOUSEHOLD_MEMBERS_READ}>{children}</PermissionGuard>
  );
}
