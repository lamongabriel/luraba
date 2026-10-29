"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Merchant } from "@luraba/contracts";
import * as React from "react";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { queryClient } from "@/lib/query-client";
import { useDeleteMerchantMutation } from "@/mutations/merchants/use-merchant-mutations";
import { merchantQueryKeys } from "@/queries/merchants/use-merchants-query";

export function DeleteMerchantModal({
  open,
  onOpenChange,
  merchant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchant?: Merchant;
}) {
  const deleteMutation = useDeleteMerchantMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: merchantQueryKeys.all });
      onOpenChange(false);
    },
    successToast: {
      title: "Merchant deleted",
    },
  });

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        deleteMutation.reset();
      }
      onOpenChange(nextOpen);
    },
    [deleteMutation, onOpenChange],
  );

  const handleConfirm = React.useCallback(() => {
    if (!merchant) {
      return;
    }
    deleteMutation.reset();
    deleteMutation.mutate(merchant.id);
  }, [merchant, deleteMutation]);

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        variant="destructive"
        icon={<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        title="Delete merchant?"
        description={
          merchant
            ? `"${merchant.name}" will be removed. Transactions using it keep their history but lose this merchant.`
            : undefined
        }
        isLoading={deleteMutation.isPending}
        size="sm"
      >
        <ModalBody>
          {deleteMutation.errorMessage ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5">
              <Typography variant="small-destructive">{deleteMutation.errorMessage}</Typography>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Delete merchant"
          confirmVariant="destructive"
          onConfirm={handleConfirm}
          isLoading={deleteMutation.isPending}
          loadingLabel="Deleting..."
        />
      </ModalContent>
    </Modal>
  );
}
