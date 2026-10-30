"use client";

import { Target02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function GoalsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={Target02Icon} strokeWidth={1.8} className="size-5" />}
      title="No goals yet"
      description="Save for something, or invest a set amount each month, and see when you'll get there."
      action={
        <PermissionButton
          permission={PERMISSIONS.GOALS_CREATE}
          deniedMessage="Your household role cannot create goals."
          onClick={onCreate}
        >
          Create your first goal
        </PermissionButton>
      }
    />
  );
}
