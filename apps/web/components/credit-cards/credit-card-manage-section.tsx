"use client";

import { Archive02Icon, ArchiveRestoreIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CreditCard } from "@luraba/contracts";
import * as React from "react";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Typography } from "@/components/ui/typography";
import { queryClient } from "@/lib/query-client";
import {
  useDeleteCreditCardMutation,
  useSetCreditCardArchivedMutation,
} from "@/mutations/credit-cards/use-credit-card-mutations";
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

  const archiveMutation = useSetCreditCardArchivedMutation({
    successToast: {
      title: ({ variables }) =>
        variables.archived ? "Credit card archived" : "Credit card restored",
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      ]);
    },
  });
  const isArchived = card.archivedAt !== null;

  return (
    // Rendered inside the card form: portaled dialogs bubble React events up to it.
    <section className="space-y-3" onSubmit={(event) => event.stopPropagation()}>
      <Typography variant="eyebrow">Manage</Typography>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-container-inset)] px-3.5 py-3">
        <div className="min-w-0">
          <Typography variant="small-strong">
            {isArchived ? "Archived credit card" : "Archive credit card"}
          </Typography>
          <Typography variant="small-muted">
            {isArchived
              ? "Hidden from lists and closed to new purchases. Its history is kept."
              : "Hides it from lists and closes it to new purchases; the history is kept. Needs nothing owed."}
          </Typography>
          {archiveMutation.errorMessage ? (
            <Typography variant="small-muted" className="text-destructive" role="alert">
              {archiveMutation.errorMessage}
            </Typography>
          ) : null}
        </div>
        <PermissionButton
          type="button"
          permission={PERMISSIONS.CREDIT_CARDS_UPDATE}
          deniedMessage="Your household role cannot archive credit cards."
          variant="outline"
          size="sm"
          disabled={archiveMutation.isPending}
          onClick={() => {
            archiveMutation.reset();
            archiveMutation.mutate({ id: card.id, archived: !isArchived });
          }}
        >
          <HugeiconsIcon icon={isArchived ? ArchiveRestoreIcon : Archive02Icon} strokeWidth={2} />
          {isArchived ? "Unarchive" : "Archive"}
        </PermissionButton>
      </div>
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
