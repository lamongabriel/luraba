"use client";

import { Wallet01Icon as WalletIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function AccountsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={WalletIcon} strokeWidth={1.8} className="size-5" />}
      title="Bring your accounts together"
      description="Add cash, investments, property, vehicles, or loans to see your full financial picture in one place."
      action={
        <PermissionButton
          permission={PERMISSIONS.ACCOUNTS_CREATE}
          deniedMessage="Your household role cannot create accounts."
          onClick={onCreate}
        >
          Add your first account
        </PermissionButton>
      }
    />
  );
}
