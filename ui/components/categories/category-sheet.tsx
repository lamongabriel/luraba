"use client"

import * as React from "react"
import { CreateEditCategoryForm } from "@/components/forms/create-edit-category-form/create-edit-category-form"
import { FormErrorBoundary } from "@/components/forms/form-error-boundary"
import { FormSheet } from "@/components/forms/form-sheet"
import type { Category } from "@/interfaces/category"

export function CategorySheet({
  open,
  onOpenChange,
  category,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
}) {
  const isEdit = Boolean(category)

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
      title={isEdit ? "Edit category" : "New category"}
      description={
        isEdit
          ? "Update the name, color, icon or parent of this category."
          : "Create a category with a color and icon to organize your money."
      }
    >
      <FormErrorBoundary>
        <CreateEditCategoryForm
          // Remount the form when switching between categories / create mode.
          key={category?.id ?? "create"}
          category={category}
          onCancel={() => handleOpenChange(false)}
          onSuccess={() => handleOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  )
}
