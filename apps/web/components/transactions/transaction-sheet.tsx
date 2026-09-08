"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ErrorState } from "@/components/error-state";
import { CreateEditTransactionForm } from "@/components/forms/create-edit-transaction-form/create-edit-transaction-form";
import { FormSheet } from "@/components/forms/form-sheet";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelDescription,
  SidePanelHeader,
} from "@/components/side-panel/side-panel";
import { TransactionDetailHeader } from "@/components/transactions/transaction-detail-header";
import { TransactionDetails } from "@/components/transactions/transaction-details";
import { Skeleton } from "@/components/ui/skeleton";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";
import { getCreditCardPayment, getCreditCardPurchase } from "@/services/credit-cards.service";
import { useAuthSessionStore } from "@/stores/auth-session-store";

export type TransactionSheetMode = "create" | "edit" | "view";

export function TransactionSheet({
  lookups,
  mode,
  onDelete,
  onModeChange,
  onOpenChange,
  open,
  row,
}: {
  lookups: TransactionLookups;
  mode: TransactionSheetMode;
  onDelete: (row: TransactionFeedRow) => void;
  onModeChange: (mode: TransactionSheetMode) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  row?: TransactionFeedRow | null;
}) {
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const purchaseQuery = useQuery({
    enabled: open && Boolean(row?.creditCardId && row?.purchaseId),
    queryKey: ["credit-cards", row?.creditCardId, "purchases", row?.purchaseId],
    queryFn: () => getCreditCardPurchase(row?.creditCardId ?? "", row?.purchaseId ?? ""),
  });
  const paymentQuery = useQuery({
    enabled: open && Boolean(row?.creditCardId && row?.paymentId),
    queryKey: ["credit-cards", row?.creditCardId, "payments", row?.paymentId],
    queryFn: () => getCreditCardPayment(row?.creditCardId ?? "", row?.paymentId ?? ""),
  });
  const detailQuery =
    row?.rowKind === "credit_card_installment"
      ? purchaseQuery
      : row?.rowKind === "credit_card_payment"
        ? paymentQuery
        : null;
  const details = React.useMemo(
    () => ({ purchase: purchaseQuery.data, payment: paymentQuery.data }),
    [paymentQuery.data, purchaseQuery.data],
  );
  const title =
    mode === "create"
      ? "New transaction"
      : mode === "edit"
        ? "Edit transaction"
        : "Transaction details";

  if (mode === "view" && row) {
    return (
      <SidePanel open={open} onOpenChange={onOpenChange}>
        <SidePanelContent className="data-[side=right]:sm:max-w-[46rem]">
          <SidePanelHeader>
            <TransactionDetailHeader
              language={language}
              lookups={lookups}
              merchantId={purchaseQuery.data?.merchantId ?? row.merchantId}
              onEdit={() => onModeChange("edit")}
              row={row}
            />
            <SidePanelDescription className="sr-only">
              Transaction details for {row.description}
            </SidePanelDescription>
          </SidePanelHeader>
          <SidePanelBody>
            {detailQuery?.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
              </div>
            ) : detailQuery?.isError ? (
              <ErrorState
                title="Couldn’t load transaction details"
                description={detailQuery.error.message}
                onRetry={() => void detailQuery.refetch()}
              />
            ) : (
              <TransactionDetails
                key={row.rowId}
                lookups={lookups}
                onDelete={() => onDelete(row)}
                row={row}
                purchase={purchaseQuery.data}
                payment={paymentQuery.data}
              />
            )}
          </SidePanelBody>
        </SidePanelContent>
      </SidePanel>
    );
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="All amounts are stored exactly as entered when you save."
    >
      {mode === "edit" && detailQuery?.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : mode === "edit" && detailQuery?.isError ? (
        <ErrorState
          title="Couldn’t load the editable transaction"
          description={detailQuery.error.message}
          onRetry={() => void detailQuery.refetch()}
        />
      ) : (
        <CreateEditTransactionForm
          key={`${mode}:${row?.rowId ?? "new"}:${purchaseQuery.data?.purchaseId ?? paymentQuery.data?.paymentId ?? "base"}`}
          details={details}
          lookups={lookups}
          row={mode === "edit" ? row : undefined}
          onCancel={mode === "edit" ? () => onModeChange("view") : undefined}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </FormSheet>
  );
}
