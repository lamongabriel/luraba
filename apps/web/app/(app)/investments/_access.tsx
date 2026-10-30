"use client";

import type { ReactNode } from "react";

import { InvestmentsSubnav } from "@/components/investments/investments-subnav";
import { PERMISSIONS, PermissionGuard } from "@/components/permissions";

export function InvestmentsAccess({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard permission={PERMISSIONS.INVESTMENTS_READ}>
      <div className="min-w-0 space-y-4">
        <InvestmentsSubnav />
        {children}
      </div>
    </PermissionGuard>
  );
}
