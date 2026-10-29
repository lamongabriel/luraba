"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import * as React from "react";
import { DeleteTransactionModal } from "@/components/transactions/delete-transaction-modal";
import {
  TransactionSheet,
  type TransactionSheetMode,
} from "@/components/transactions/transaction-sheet";
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query";

/**
 * The regular transaction details/edit/delete flow, opened for a purchase or payment of a card.
 * The parent owns which row is selected; closing the sheet calls `onClose`.
 */
export function CardTransactionSheet({
  row,
  onClose,
}: {
  row: TransactionFeedRow | null;
  onClose: () => void;
}) {
  const lookupsQuery = useTransactionLookupsQuery();
  const [mode, setMode] = React.useState<TransactionSheetMode>("view");
  const [deleteRow, setDeleteRow] = React.useState<TransactionFeedRow | null>(null);

  React.useEffect(() => {
    if (row) setMode("view");
  }, [row]);

  return (
    <>
      {lookupsQuery.data ? (
        <TransactionSheet
          open={row !== null && deleteRow === null}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          mode={mode}
          onModeChange={setMode}
          row={row}
          lookups={lookupsQuery.data}
          onDelete={setDeleteRow}
        />
      ) : null}
      <DeleteTransactionModal
        open={deleteRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRow(null);
            onClose();
          }
        }}
        row={deleteRow}
      />
    </>
  );
}
