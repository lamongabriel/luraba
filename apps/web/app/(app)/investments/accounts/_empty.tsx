"use client";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function InvestmentAccountsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No investment accounts yet"
      description="Create an account for each broker or bank where you hold investments."
      action={
        <PermissionButton permission={PERMISSIONS.INVESTMENTS_WRITE} onClick={onCreate}>
          Create an account
        </PermissionButton>
      }
    />
  );
}
