"use client";

import { Layers01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function CategoriesEmpty({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={<HugeiconsIcon icon={Layers01Icon} strokeWidth={1.8} className="size-5" />}
        title="No matching categories"
        description="Try adjusting your search or type filter."
      />
    );
  }

  return (
    <EmptyState
      icon={<HugeiconsIcon icon={Layers01Icon} strokeWidth={1.8} className="size-5" />}
      title="Organize your money with categories"
      description="Create categories for income and expenses to see where your money comes from and where it goes."
      action={
        <PermissionButton
          permission={PERMISSIONS.CATEGORIES_CREATE}
          deniedMessage="Your household role cannot create categories."
          onClick={onCreate}
        >
          Add your first category
        </PermissionButton>
      }
    />
  );
}
