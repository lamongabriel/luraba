"use client";

import { Invoice01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function BillsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={Invoice01Icon} strokeWidth={1.8} className="size-5" />}
      title="No bills yet"
      description="Add a recurring payment like water, rent or a loan and Luraba will remind you."
      action={
        <PermissionButton
          permission={PERMISSIONS.BILLS_CREATE}
          deniedMessage="Your household role cannot create bills."
          onClick={onCreate}
        >
          Add your first bill
        </PermissionButton>
      }
    />
  );
}
