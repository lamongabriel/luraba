"use client"

import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
} from "@/components/ui/modal"
import { Typography } from "@/components/ui/typography"
import type { Category } from "@/interfaces/category"
import { queryClient } from "@/lib/query-client"
import { useDeleteCategoryMutation } from "@/mutations/categories/use-category-mutations"
import { categoryQueryKeys } from "@/queries/categories/use-categories-query"

export function DeleteCategoryModal({
  open,
  onOpenChange,
  category,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
}) {
  const deleteMutation = useDeleteCategoryMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: categoryQueryKeys.lists(),
      })
      onOpenChange(false)
    },
    successToast: {
      title: "Category deleted",
    },
  })

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        deleteMutation.reset()
      }
      onOpenChange(nextOpen)
    },
    [deleteMutation, onOpenChange],
  )

  const handleConfirm = React.useCallback(() => {
    if (!category) {
      return
    }
    deleteMutation.reset()
    deleteMutation.mutate(category.id)
  }, [category, deleteMutation])

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        variant="destructive"
        icon={<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        title="Delete category?"
        description={
          category
            ? `"${category.name}" will be removed. Transactions using it will keep their history but lose this category.`
            : undefined
        }
        isLoading={deleteMutation.isPending}
        size="sm"
      >
        <ModalBody>
          {deleteMutation.errorMessage ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5">
              <Typography variant="small-destructive">
                {deleteMutation.errorMessage}
              </Typography>
              <Typography variant="small-muted" className="mt-1 text-[0.72rem]">
                This category may be in use by a budget. Remove it from any
                budgets before deleting.
              </Typography>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Delete category"
          confirmVariant="destructive"
          onConfirm={handleConfirm}
          isLoading={deleteMutation.isPending}
          loadingLabel="Deleting..."
        />
      </ModalContent>
    </Modal>
  )
}
