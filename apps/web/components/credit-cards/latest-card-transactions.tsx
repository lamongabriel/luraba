"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import * as React from "react";
import { ErrorState } from "@/components/error-state";
import { MoneyValue } from "@/components/finance/money-value";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

const LATEST_COUNT = 15;

/** Installments of one purchase share a purchase date, so show each purchase or payment once. */
export function dedupeCardRows(rows: TransactionFeedRow[], count: number): TransactionFeedRow[] {
  const seen = new Set<string>();
  const result: TransactionFeedRow[] = [];
  for (const row of rows) {
    const key = row.purchaseId ?? row.paymentId ?? row.rowId;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
    if (result.length === count) break;
  }
  return result;
}

/** The latest purchases and payments across all cards, newest first. */
export function LatestCardTransactions({
  language,
  cardNames,
  onSelect,
}: {
  language: string;
  cardNames: Map<string, string>;
  onSelect: (row: TransactionFeedRow) => void;
}) {
  const precisionOf = useCurrencyPrecision();
  const query = useTransactionsQuery({
    originTypes: ["credit_card_installment", "credit_card_payment"],
    sort: "purchaseDate",
    sortDirection: "desc",
    perPage: LATEST_COUNT * 3,
  });
  const rows = React.useMemo(
    () => dedupeCardRows(query.data?.data ?? [], LATEST_COUNT),
    [query.data],
  );

  let content: React.ReactNode;
  if (query.isPending) {
    content = (
      <div className="space-y-2">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton key={key} className="h-10 rounded-lg bg-muted/50" />
        ))}
      </div>
    );
  } else if (query.isError) {
    content = (
      <ErrorState
        title="Couldn't load transactions"
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (rows.length === 0) {
    content = <Typography variant="body-muted">No card transactions yet.</Typography>;
  } else {
    content = (
      <ul className="divide-y divide-border/60">
        {rows.map((row) => {
          const isPayment = row.rowKind === "credit_card_payment";
          const cardName = row.creditCardId ? cardNames.get(row.creditCardId) : undefined;
          const installment =
            row.installmentCount && row.installmentCount > 1
              ? ` · ${row.installmentNumber}/${row.installmentCount}`
              : "";

          return (
            <li key={row.rowId}>
              <button
                type="button"
                onClick={() => onSelect(row)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:text-primary"
              >
                <span className="min-w-0">
                  <Typography variant="small-strong" className="truncate">
                    {row.description}
                    {installment}
                  </Typography>
                  <Typography variant="small-muted">
                    {formatShortDate(row.purchaseDate, language)}
                    {cardName ? ` · ${cardName}` : ""}
                  </Typography>
                </span>
                <MoneyValue
                  amount={isPayment ? row.amount : -row.amount}
                  currencyCode={row.currencyCode}
                  language={language}
                  precision={precisionOf(row.currencyCode)}
                  signed
                  className={
                    isPayment ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm"
                  }
                />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="rounded-xl border border-border/60 p-4">
      <Typography variant="small-strong" className="mb-2">
        Latest transactions
      </Typography>
      {content}
    </section>
  );
}
