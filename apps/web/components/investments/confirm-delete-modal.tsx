"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";

/** A destructive confirmation shared by the investment screens (transactions, portfolios). */
export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isLoading,
  errorMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isLoading: boolean;
  errorMessage?: string;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        variant="destructive"
        icon={<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        title={title}
        description={description}
        isLoading={isLoading}
        size="sm"
      >
        <ModalBody>
          {errorMessage ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5">
              <Typography variant="small-destructive">{errorMessage}</Typography>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel={confirmLabel}
          confirmVariant="destructive"
          onConfirm={onConfirm}
          isLoading={isLoading}
          loadingLabel="Deleting..."
        />
      </ModalContent>
    </Modal>
  );
}
