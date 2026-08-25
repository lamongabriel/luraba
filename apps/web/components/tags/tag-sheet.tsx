"use client"

import * as React from "react"
import { CreateEditTagForm } from "@/components/forms/create-edit-tag-form/create-edit-tag-form"
import { FormErrorBoundary } from "@/components/forms/form-error-boundary"
import { FormSheet } from "@/components/forms/form-sheet"
import type { Tag } from "@/interfaces/tag"

export function TagSheet({
  open,
  onOpenChange,
  tag,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: Tag
}) {
  const isEdit = Boolean(tag)

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? "Edit tag" : "New tag"}
      description={
        isEdit
          ? "Update the name, color or icon of this tag."
          : "Create a tag with a color and icon to organize your transactions."
      }
    >
      <FormErrorBoundary>
        <CreateEditTagForm
          // Remount the form when switching between tags / create mode.
          key={tag?.id ?? "create"}
          tag={tag}
          onCancel={() => handleOpenChange(false)}
          onSuccess={() => handleOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  )
}
