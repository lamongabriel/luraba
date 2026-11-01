"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Typography } from "@/components/ui/typography";
import { queryClient } from "@/lib/query-client";
import {
  useDeleteCreditCardPaymentMutation,
  useDeleteCreditCardPurchaseMutation,
} from "@/mutations/credit-cards/use-credit-card-transaction-mutations";
import { useDeleteTransactionMutation } from "@/mutations/transactions/use-transaction-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

/**
 * Confirms deleting a transaction. It opens above the details sheet: cancelling only closes this
 * dialog, and a successful delete closes it and calls `onDeleted` so the page can close the sheet.
 */
export function DeleteTransactionModal({
  onDeleted,
  onOpenChange,
  open,
  row,
}: {
  onDeleted?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row?: TransactionFeedRow | null;
}) {
  const finish = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
    ]);
    onOpenChange(false);
    onDeleted?.();
  };
  const transactionMutation = useDeleteTransactionMutation({ onSuccess: finish });
  const purchaseMutation = useDeleteCreditCardPurchaseMutation({ onSuccess: finish });
  const paymentMutation = useDeleteCreditCardPaymentMutation({ onSuccess: finish });
  const mutation =
    row?.rowKind === "credit_card_installment"
      ? purchaseMutation
      : row?.rowKind === "credit_card_payment"
        ? paymentMutation
        : transactionMutation;

  const handleDelete = () => {
    if (!row) return;

    if (row.rowKind === "credit_card_installment" && row.creditCardId && row.purchaseId) {
      purchaseMutation.mutate({ creditCardId: row.creditCardId, purchaseId: row.purchaseId });
      return;
    }

    if (row.rowKind === "credit_card_payment" && row.creditCardId && row.paymentId) {
      paymentMutation.mutate({ creditCardId: row.creditCardId, paymentId: row.paymentId });
      return;
    }

    transactionMutation.mutate(row.id);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete transaction?"
      description={
        row?.rowKind === "credit_card_installment"
          ? "This installment belongs to a credit card purchase. Deleting it removes the parent purchase and every installment in its schedule."
          : "This transaction and its ledger entries will be permanently removed."
      }
      confirmLabel="Delete transaction"
      loadingLabel="Deleting..."
      isLoading={mutation.isPending}
      errorMessage={mutation.errorMessage || undefined}
      onConfirm={handleDelete}
    >
      {row ? <Typography variant="small-muted">{row.description}</Typography> : null}
    </ConfirmDialog>
  );
}
