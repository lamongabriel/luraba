"use client";

import { formatShortDate } from "@luraba/domain";
import * as React from "react";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { MoneyValue } from "@/components/finance/money-value";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useLinkOccurrenceMutation } from "@/mutations/bills/use-bill-mutations";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

export function LinkTransactionModal({
  open,
  onOpenChange,
  billId,
  occurrenceId,
  currencyCode,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  occurrenceId?: string;
  currencyCode: string;
  language: string;
}) {
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string>();

  const query = useTransactionsQuery(
    { search: search.trim() || undefined, originTypes: "expense", perPage: 20 },
    { enabled: open },
  );
  const rows = (query.data?.data ?? []).filter((row) => row.currencyCode === currencyCode);

  const mutation = useLinkOccurrenceMutation({
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
        title="Link a transaction"
        description={`Choose the ${currencyCode} expense that paid this bill.`}
        isLoading={mutation.isPending}
        size="md"
      >
        <ModalBody className="space-y-3">
          <DataTableSearchInput
            value={search}
            placeholder="Search expenses..."
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {query.isPending ? (
              <Typography variant="small-muted">Loading...</Typography>
            ) : rows.length === 0 ? (
              <Typography variant="small-muted">No matching expenses.</Typography>
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
          confirmDisabled={!selectedId || !occurrenceId}
          isLoading={mutation.isPending}
          loadingLabel="Linking..."
          onConfirm={() => {
            if (!selectedId || !occurrenceId) return;
            mutation.mutate({ target: { id: billId, occurrenceId }, transactionId: selectedId });
          }}
        />
      </ModalContent>
    </Modal>
  );
}
