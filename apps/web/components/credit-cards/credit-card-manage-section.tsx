"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard } from "@luraba/contracts";
import * as React from "react";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Typography } from "@/components/ui/typography";
import { queryClient } from "@/lib/query-client";
import { useDeleteCreditCardMutation } from "@/mutations/credit-cards/use-credit-card-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

/**
 * The edit sheet's "Manage" part: delete the card behind a confirmation. Deleting is only reached
 * through Edit, never from a page action, like accounts.
 */
export function CreditCardManageSection({
  card,
  onDeleted,
}: {
  card: CreditCard;
  onDeleted: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const deleteMutation = useDeleteCreditCardMutation({
    successToast: { title: "Credit card deleted" },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      ]);
      setConfirmOpen(false);
      onDeleted();
    },
  });

  return (
    // Rendered inside the card form: portaled dialogs bubble React events up to it.
    <section className="space-y-3" onSubmit={(event) => event.stopPropagation()}>
      <Typography variant="eyebrow">Manage</Typography>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3">
        <div className="min-w-0">
          <Typography variant="small-strong">Delete credit card</Typography>
          <Typography variant="small-muted">
            Removes the card, its invoices and its purchases.
          </Typography>
        </div>
        <PermissionButton
          type="button"
          permission={PERMISSIONS.CREDIT_CARDS_DELETE}
          deniedMessage="Your household role cannot delete credit cards."
          variant="destructive"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          Delete
        </PermissionButton>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!deleteMutation.isPending) setConfirmOpen(open);
        }}
        title={`Delete ${card.name}?`}
        description="This permanently removes the card, its invoices and every purchase and payment recorded on it. This cannot be undone."
        confirmLabel="Delete card"
        loadingLabel="Deleting..."
        isLoading={deleteMutation.isPending}
        errorMessage={deleteMutation.errorMessage || undefined}
        onConfirm={() => {
          deleteMutation.reset();
          deleteMutation.mutate(card.id);
        }}
      />
    </section>
  );
}
