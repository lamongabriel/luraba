"use client";

import { formatShortDate } from "@luraba/domain";
import * as React from "react";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { MoneyValue } from "@/components/finance/money-value";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useLinkInstallmentMutation } from "@/mutations/splits/use-split-mutations";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

export function LinkIncomeModal({
  open,
  onOpenChange,
  splitId,
  installmentId,
  currencyCode,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  splitId: string;
  installmentId?: string;
  currencyCode: string;
  language: string;
}) {
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string>();

  const query = useTransactionsQuery(
    { search: search.trim() || undefined, originTypes: "income", perPage: 20 },
    { enabled: open },
  );
  const rows = (query.data?.data ?? []).filter((row) => row.currencyCode === currencyCode);

  const mutation = useLinkInstallmentMutation({
    onSuccess: () => onOpenChange(false),
    successToast: { title: "Payment linked" },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      mutation.reset();
      setSelectedId(undefined);
      setSearch("");
    }
    onOpenChange(next);
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        title="Link a payment received"
        description={`Choose the incoming ${currencyCode} transaction that paid this installment.`}
        isLoading={mutation.isPending}
        size="md"
      >
        <ModalBody className="space-y-3">
          <DataTableSearchInput
            value={search}
            placeholder="Search incoming transactions..."
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {query.isPending ? (
              <Typography variant="small-muted">Loading...</Typography>
            ) : rows.length === 0 ? (
              <Typography variant="small-muted">No matching incoming transactions.</Typography>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:bg-muted/50",
                    selectedId === row.id && "border-primary/50 bg-muted/60",
                  )}
                >
                  <span className="min-w-0">
                    <Typography variant="small-strong" className="truncate">
                      {row.description}
                    </Typography>
                    <Typography variant="small-muted">
                      {formatShortDate(row.postedDate, language)}
                    </Typography>
                  </span>
                  <MoneyValue
                    amount={row.amount}
                    currencyCode={row.currencyCode}
                    language={language}
                    className="shrink-0 text-sm"
                  />
                </button>
              ))
            )}
          </div>
          {mutation.errorMessage ? (
            <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Link transaction"
          confirmDisabled={!selectedId || !installmentId}
          isLoading={mutation.isPending}
          loadingLabel="Linking..."
          onConfirm={() => {
            if (!selectedId || !installmentId) return;
            mutation.mutate({ target: { id: splitId, installmentId }, transactionId: selectedId });
          }}
        />
      </ModalContent>
    </Modal>
  );
}
