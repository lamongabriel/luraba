"use client"

import type {
  TransactionFeedRow,
  UpdateTransactionInput,
} from "@luraba/contracts"
import * as React from "react"
import { queryClient } from "@/lib/query-client"
import { useUpdateCreditCardPurchaseMutation } from "@/mutations/credit-cards/use-credit-card-transaction-mutations"
import { useUpdateTransactionMutation } from "@/mutations/transactions/use-transaction-mutations"
import { accountQueryKeys } from "@/queries/accounts/use-accounts-query"
import { budgetQueryKeys } from "@/queries/budgets/use-monthly-budget-query"
import { creditCardQueryKeys } from "@/queries/credit-cards/use-credit-cards-query"
import { transactionAnalyticsQueryKeys } from "@/queries/transactions/use-transaction-analytics-query"
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query"

export type InlineTransactionUpdate = Pick<
  UpdateTransactionInput,
  "categoryId" | "merchantId" | "tagIds" | "includeInBudget"
>

export interface InlineTransactionUpdateOptions {
  onError?: () => void
  onSuccess?: () => void
}

export function useTransactionInlineUpdates(row: TransactionFeedRow) {
  const invalidate = React.useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: transactionAnalyticsQueryKeys.all,
      }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: budgetQueryKeys.all }),
    ])
  }, [])

  const transactionMutation = useUpdateTransactionMutation({
    onSuccess: invalidate,
    errorToast: { title: "Couldn't update transaction" },
  })
  const purchaseMutation = useUpdateCreditCardPurchaseMutation({
    onSuccess: invalidate,
    errorToast: { title: "Couldn't update installment purchase" },
  })

  const update = React.useCallback(
    (
      body: InlineTransactionUpdate,
      options?: InlineTransactionUpdateOptions,
    ) => {
      if (
        row.rowKind === "credit_card_installment" &&
        row.purchaseId &&
        row.creditCardId
      ) {
        purchaseMutation.mutate(
          {
            creditCardId: row.creditCardId,
            purchaseId: row.purchaseId,
            body,
          },
          options,
        )
        return
      }

      if (row.rowKind === "transaction") {
        transactionMutation.mutate({ id: row.id, body }, options)
      }
    },
    [purchaseMutation, row, transactionMutation],
  )

  return {
    error: transactionMutation.error ?? purchaseMutation.error,
    isPending: transactionMutation.isPending || purchaseMutation.isPending,
    update,
  }
}
