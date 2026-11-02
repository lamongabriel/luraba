"use client";

import {
  PERMISSIONS,
  type TransactionFeedRow,
  type UpdateTransactionInput,
} from "@luraba/contracts";
import * as React from "react";
import { useCan } from "@/components/permissions/use-can";
import { queryClient } from "@/lib/query-client";
import {
  useUpdateCreditCardPaymentMutation,
  useUpdateCreditCardPurchaseMutation,
} from "@/mutations/credit-cards/use-credit-card-transaction-mutations";
import { useUpdateTransactionMutation } from "@/mutations/transactions/use-transaction-mutations";
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query";
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query";
import { transactionAnalyticsQueryKeys } from "@/queries/transactions/use-transaction-analytics-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";

export type InlineTransactionUpdate = Pick<
  UpdateTransactionInput,
  "categoryId" | "merchantId" | "tagIds" | "includeInBudget" | "notes" | "originalDescription"
>;

export interface InlineTransactionUpdateOptions {
  onError?: () => void;
  onSuccess?: () => void;
}

export function useTransactionInlineUpdates(row: TransactionFeedRow) {
  const canUpdate = useCan()(PERMISSIONS.TRANSACTIONS_UPDATE);
  const invalidate = React.useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: transactionAnalyticsQueryKeys.all,
      }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
    ]);
  }, []);

  const transactionMutation = useUpdateTransactionMutation({
    onSuccess: invalidate,
    errorToast: { title: "Couldn't update transaction" },
  });
  const purchaseMutation = useUpdateCreditCardPurchaseMutation({
    onSuccess: invalidate,
    errorToast: { title: "Couldn't update installment purchase" },
  });

  const paymentMutation = useUpdateCreditCardPaymentMutation({
    onSuccess: invalidate,
    errorToast: { title: "Couldn't update card payment" },
  });

  const update = React.useCallback(
    (body: InlineTransactionUpdate, options?: InlineTransactionUpdateOptions) => {
      if (row.rowKind === "credit_card_installment" && row.purchaseId && row.creditCardId) {
        purchaseMutation.mutate(
          {
            creditCardId: row.creditCardId,
            purchaseId: row.purchaseId,
            body,
          },
          options,
        );
        return;
      }

      if (row.rowKind === "credit_card_payment" && row.paymentId && row.creditCardId) {
        paymentMutation.mutate(
          {
            creditCardId: row.creditCardId,
            paymentId: row.paymentId,
            body: {
              ...(body.notes === undefined ? {} : { notes: body.notes }),
              ...(body.originalDescription === undefined
                ? {}
                : { originalDescription: body.originalDescription }),
            },
          },
          options,
        );
        return;
      }

      if (row.rowKind === "transaction") {
        transactionMutation.mutate({ id: row.id, body }, options);
      }
    },
    [paymentMutation, purchaseMutation, row, transactionMutation],
  );

  return {
    canUpdate,
    error: transactionMutation.error ?? purchaseMutation.error ?? paymentMutation.error,
    isPending:
      transactionMutation.isPending || purchaseMutation.isPending || paymentMutation.isPending,
    update,
  };
}
