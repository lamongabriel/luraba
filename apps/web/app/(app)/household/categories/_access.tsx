"use client";

import type { ReactNode } from "react";

import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function CategoriesAccess({ children }: { children: ReactNode }) {
  return <PermissionGuard permission={PERMISSIONS.CATEGORIES_READ}>{children}</PermissionGuard>;
}
