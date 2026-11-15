"use client";

import { PiggyBankIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function PiggyBanksEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={PiggyBankIcon} strokeWidth={1.8} className="size-5" />}
      title="No piggy banks yet"
      description="Split an account's balance into named buckets that earn interest every day and count toward your goals."
      action={
        <PermissionButton
          permission={PERMISSIONS.PIGGY_BANKS_CREATE}
          deniedMessage="Your household role cannot create piggy banks."
          onClick={onCreate}
        >
          Create your first piggy bank
        </PermissionButton>
      }
    />
  );
}
