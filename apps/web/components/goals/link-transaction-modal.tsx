"use client";

import { formatShortDate } from "@luraba/domain";
import * as React from "react";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { MoneyValue } from "@/components/finance/money-value";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits, minorToMajorUnits } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { useAddContributionMutation } from "@/mutations/goals/use-goal-mutations";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

/** Counts an existing transaction (all of it, or part of it) toward a goal. */
export function LinkGoalTransactionModal({
  open,
  onOpenChange,
  goalId,
  currencyCode,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  currencyCode: string;
  language: string;
}) {
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string>();
  const [amount, setAmount] = React.useState("");

  const query = useTransactionsQuery(
    { search: search.trim() || undefined, originTypes: "expense,transfer", perPage: 20 },
    { enabled: open },
  );
  const rows = (query.data?.data ?? []).filter((row) => row.currencyCode === currencyCode);
  const selected = rows.find((row) => row.id === selectedId);

  const mutation = useAddContributionMutation({
    onSuccess: () => onOpenChange(false),
    successToast: { title: "Transaction linked" },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      mutation.reset();
      setSelectedId(undefined);
      setSearch("");
      setAmount("");
    }
    onOpenChange(next);
  };

  const select = (id: string, transactionAmount: number) => {
    setSelectedId(id);
    setAmount(String(minorToMajorUnits(transactionAmount, 2)));
  };

  const minor = amount ? majorToMinorUnits(Number(amount), 2) : undefined;
  const tooMuch = selected !== undefined && minor !== undefined && minor > selected.amount;

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        title="Link a transaction"
        description={`Pick the ${currencyCode} transaction that moved money toward this goal.`}
        isLoading={mutation.isPending}
        size="md"
      >
        <ModalBody className="space-y-3">
          <DataTableSearchInput
            value={search}
            placeholder="Search transactions..."
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {query.isPending ? (
              <Typography variant="small-muted">Loading...</Typography>
            ) : rows.length === 0 ? (
              <Typography variant="small-muted">No matching transactions.</Typography>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => select(row.id, row.amount)}
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
          {selected ? (
            <div className="space-y-1.5">
              <Label htmlFor="link-goal-amount">Amount that counts toward the goal</Label>
              <Input
                id="link-goal-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {tooMuch ? (
                <Typography variant="small-destructive">
                  That is more than the transaction moved.
                </Typography>
              ) : null}
            </div>
          ) : null}
          {mutation.errorMessage ? (
            <Typography variant="small-destructive">{mutation.errorMessage}</Typography>
          ) : null}
        </ModalBody>
        <ModalFooter
          cancelLabel="Cancel"
          confirmLabel="Link transaction"
          confirmDisabled={!selected || !minor || minor <= 0 || tooMuch}
          isLoading={mutation.isPending}
          loadingLabel="Linking..."
          onConfirm={() => {
            if (!selected || !minor) return;
            mutation.mutate({
              id: goalId,
              body: {
                transactionId: selected.id,
                // Leave the amount out when the whole transaction counts.
                ...(minor === selected.amount ? {} : { amount: minor }),
              },
            });
          }}
        />
      </ModalContent>
    </Modal>
  );
}
