"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ApiKey } from "@luraba/contracts";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";

export function DeleteApiKeyModal({
  apiKey,
  isPending,
  onClose,
  onConfirm,
}: {
  apiKey: ApiKey | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (apiKey: ApiKey) => void;
}) {
  return (
    <Modal open={apiKey !== null} onOpenChange={(open) => !open && onClose()}>
      <ModalContent
        icon={<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        variant="destructive"
        title={`Delete ${apiKey?.name ?? "this key"}?`}
        description="Anything using this key stops working right away. This cannot be undone."
        isLoading={isPending}
        size="sm"
      >
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Delete key"
          confirmVariant="destructive"
          isLoading={isPending}
          loadingLabel="Deleting..."
          onConfirm={() => apiKey && onConfirm(apiKey)}
        />
      </ModalContent>
    </Modal>
  );
}
