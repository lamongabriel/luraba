"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function CreditCardsAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.CREDIT_CARDS_READ}>{children}</PermissionGuard>;
}
