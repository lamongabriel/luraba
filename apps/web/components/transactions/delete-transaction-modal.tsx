"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { queryClient } from "@/lib/query-client";
import {
  useDeleteCreditCardPaymentMutation,
  useDeleteCreditCardPurchaseMutation,
} from "@/mutations/credit-cards/use-credit-card-transaction-mutations";
import { useDeleteTransactionMutation } from "@/mutations/transactions/use-transaction-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { budgetQueryKeys } from "@/queries/budgets/use-monthly-budget-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

export function DeleteTransactionModal({
  onOpenChange,
  open,
  row,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row?: TransactionFeedRow | null;
}) {
  const finish = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.all }),
    ]);
    onOpenChange(false);
  };
  const transactionMutation = useDeleteTransactionMutation({
    onSuccess: finish,
  });
  const purchaseMutation = useDeleteCreditCardPurchaseMutation({
    onSuccess: finish,
  });
  const paymentMutation = useDeleteCreditCardPaymentMutation({
    onSuccess: finish,
  });
  const mutation =
    row?.rowKind === "credit_card_installment"
      ? purchaseMutation
      : row?.rowKind === "credit_card_payment"
        ? paymentMutation
        : transactionMutation;

  const handleDelete = () => {
    if (!row) return;

    if (row.rowKind === "credit_card_installment" && row.creditCardId && row.purchaseId) {
      purchaseMutation.mutate({
        creditCardId: row.creditCardId,
        purchaseId: row.purchaseId,
      });
      return;
    }

    if (row.rowKind === "credit_card_payment" && row.creditCardId && row.paymentId) {
      paymentMutation.mutate({
        creditCardId: row.creditCardId,
        paymentId: row.paymentId,
      });
      return;
    }

    transactionMutation.mutate(row.id);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        variant="destructive"
        icon={<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />}
        title="Delete transaction?"
        description={
          row?.rowKind === "credit_card_installment"
            ? "This installment belongs to a credit card purchase. Deleting it removes the parent purchase and every installment in its schedule."
            : "This transaction and its ledger entries will be permanently removed."
        }
        isLoading={mutation.isPending}
        size="sm"
      >
        <ModalBody>
          {row ? <Typography variant="small-muted">{row.description}</Typography> : null}
          {mutation.errorMessage ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2.5">
              <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter
          confirmLabel="Delete transaction"
          confirmVariant="destructive"
          loadingLabel="Deleting..."
          isLoading={mutation.isPending}
          onConfirm={handleDelete}
        />
      </ModalContent>
    </Modal>
  );
}
