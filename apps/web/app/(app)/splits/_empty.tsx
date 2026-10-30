"use client";

import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function SplitsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.8} className="size-5" />}
      title="No split purchases yet"
      description="Paid for something others are chipping in on? Add it and track who has paid you back."
      action={
        <PermissionButton
          permission={PERMISSIONS.SPLITS_CREATE}
          deniedMessage="Your household role cannot create splits."
          onClick={onCreate}
        >
          Add your first split
        </PermissionButton>
      }
    />
  );
}
