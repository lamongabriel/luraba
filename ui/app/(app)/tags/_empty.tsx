"use client"

import { TagsIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { EmptyState } from "@/components/empty-state"
import { PERMISSIONS, PermissionButton } from "@/components/permissions"

export function TagsEmpty({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean
  onCreate: () => void
}) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={
          <HugeiconsIcon icon={TagsIcon} strokeWidth={1.8} className="size-5" />
        }
        title="No matching tags"
        description="Try adjusting your search."
      />
    )
  }

  return (
    <EmptyState
      icon={
        <HugeiconsIcon icon={TagsIcon} strokeWidth={1.8} className="size-5" />
      }
      title="Tag your transactions"
      description="Create tags to label and group transactions your own way, across any account or category."
      action={
        <PermissionButton
          permission={PERMISSIONS.TAGS_CREATE}
          deniedMessage="Your household role cannot create tags."
          onClick={onCreate}
        >
          Add your first tag
        </PermissionButton>
      }
    />
  )
}
