"use client";

import { Store01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function MerchantsEmpty({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  const icon = <HugeiconsIcon icon={Store01Icon} strokeWidth={1.8} className="size-5" />;

  if (hasFilters) {
    return (
      <EmptyState
        icon={icon}
        title="No matching merchants"
        description="Try adjusting your search."
      />
    );
  }

  return (
    <EmptyState
      icon={icon}
      title="Add your merchants"
      description="Merchants are the shops and services you pay. Give them a logo so transactions are easy to recognize."
      action={
        <PermissionButton
          permission={PERMISSIONS.MERCHANTS_CREATE}
          deniedMessage="Your household role cannot create merchants."
          onClick={onCreate}
        >
          Add your first merchant
        </PermissionButton>
      }
    />
  );
}
