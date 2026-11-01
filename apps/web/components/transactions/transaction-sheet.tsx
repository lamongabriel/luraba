"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ErrorState } from "@/components/error-state";
import { CreateEditTransactionForm } from "@/components/forms/create-edit-transaction-form/create-edit-transaction-form";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelHeader,
} from "@/components/side-panel/side-panel";
import { TransactionSheetHeader } from "@/components/transactions/transaction-detail-header";
import { TransactionDetails } from "@/components/transactions/transaction-details";
import { Skeleton } from "@/components/ui/skeleton";
import { useRetainedValue } from "@/hooks/use-retained-value";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";
import { getCreditCardPayment, getCreditCardPurchase } from "@/services/credit-cards.service";
import { useAuthSessionStore } from "@/stores/auth-session-store";

export type TransactionSheetMode = "create" | "edit" | "view";

/**
 * The one sheet for creating, viewing and editing a transaction. View and edit swap inside the same
 * sheet (same overlay, header and spacing), so switching never flickers the backdrop, and a save
 * returns to the details. Delete is confirmed in a dialog above it; closing that dialog leaves the
 * sheet open.
 */
export function TransactionSheet({
  lookups,
  mode,
  onDelete,
  onModeChange,
  onOpenChange,
  open,
  row: liveRow,
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
  // The page may clear the row as soon as the sheet closes; keep showing it until the exit ends.
  const row = useRetainedValue(liveRow, open);
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
  const showDetails = mode === "view" && Boolean(row);

  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <TransactionSheetHeader
            language={language}
            lookups={lookups}
            mode={mode === "view" && !row ? "create" : mode}
            row={row}
            onEdit={() => onModeChange("edit")}
            onBack={() => onModeChange("view")}
          />
        </SidePanelHeader>
        <SidePanelBody className="flex-1">
          {showDetails && row ? (
            detailQuery?.isPending ? (
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
            )
          ) : mode === "edit" && detailQuery?.isPending ? (
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
              onSuccess={() => (mode === "edit" ? onModeChange("view") : onOpenChange(false))}
            />
          )}
        </SidePanelBody>
      </SidePanelContent>
    </SidePanel>
  );
}
