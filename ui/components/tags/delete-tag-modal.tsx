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
import type { Tag } from "@/interfaces/tag"
import { queryClient } from "@/lib/query-client"
import { useDeleteTagMutation } from "@/mutations/tags/use-tag-mutations"
import { tagQueryKeys } from "@/queries/tags/use-tags-query"

export function DeleteTagModal({
  open,
  onOpenChange,
  tag,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag?: Tag
}) {
  const deleteMutation = useDeleteTagMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tagQueryKeys.lists() })
      onOpenChange(false)
    },
    successToast: {
      title: "Tag deleted",
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
    if (!tag) {
      return
    }
    deleteMutation.reset()
    deleteMutation.mutate(tag.id)
  }, [tag, deleteMutation])

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        variant="destructive"
        icon={<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        title="Delete tag?"
        description={
          tag
            ? `"${tag.name}" will be removed. Transactions using it will keep their history but lose this tag.`
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
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Delete tag"
          confirmVariant="destructive"
          onConfirm={handleConfirm}
          isLoading={deleteMutation.isPending}
          loadingLabel="Deleting..."
        />
      </ModalContent>
    </Modal>
  )
}
