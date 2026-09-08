"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { MoneyValue } from "@/components/finance/money-value";
import { InlineCategoryCell } from "@/components/tables/transactions/transaction-inline-editors";
import {
  TransactionAccountDisplay,
  TransactionMerchantDisplay,
} from "@/components/tables/transactions/transaction-resource-display";
import { TransactionTypeBadge } from "@/components/tables/transactions/transaction-type-badge";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

function DetailsCell({ row }: { row: TransactionFeedRow }) {
  const details =
    row.originType === "transfer"
      ? `${row.accountName ?? "No account"}${row.toAccountName ? ` → ${row.toAccountName}` : ""}`
      : row.description;

  return <span className="block min-w-48 truncate text-xs font-medium">{details}</span>;
}

function AmountCell({
  language,
  lookups,
  row,
}: {
  language: string;
  lookups: TransactionLookups;
  row: TransactionFeedRow;
}) {
  const precision =
    lookups.currencies.find((currency) => currency.code === row.currencyCode)?.precision ?? 2;
  const toPrecision =
    lookups.currencies.find((currency) => currency.code === row.toCurrencyCode)?.precision ?? 2;
  const isExpense = row.originType === "expense" || row.originType === "credit_card_installment";
  const isIncome = row.originType === "income";

  if (row.originType === "transfer" && row.toAmount !== null && row.toCurrencyCode) {
    return (
      <div className="flex min-w-44 items-center justify-end gap-1.5 whitespace-nowrap">
        <MoneyValue
          amount={row.amount}
          currencyCode={row.currencyCode}
          language={language}
          precision={precision}
        />
        <span className="text-muted-foreground">→</span>
        <MoneyValue
          amount={row.toAmount}
          currencyCode={row.toCurrencyCode}
          language={language}
          precision={toPrecision}
        />
      </div>
    );
  }

  return (
    <div className="min-w-28 text-right">
      <MoneyValue
        amount={isExpense ? -Math.abs(row.amount) : isIncome ? Math.abs(row.amount) : row.amount}
        currencyCode={row.currencyCode}
        language={language}
        precision={precision}
        signed={isExpense || isIncome}
        className={cn(isExpense && "text-destructive", isIncome && "text-emerald-400")}
      />
    </div>
  );
}

export function getTransactionsTableColumns({
  language,
  lookups,
}: {
  language: string;
  lookups: TransactionLookups;
}): ColumnDef<TransactionFeedRow>[] {
  return [
    {
      id: "account",
      header: "Account",
      cell: ({ row }) => <TransactionAccountDisplay row={row.original} lookups={lookups} />,
      enableSorting: false,
      meta: { label: "Account" },
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Details" />,
      cell: ({ row }) => <DetailsCell row={row.original} />,
      meta: { label: "Details" },
    },
    {
      accessorKey: "originType",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Type" />,
      cell: ({ row }) => <TransactionTypeBadge type={row.original.originType} />,
      meta: { label: "Type" },
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => <InlineCategoryCell lookups={lookups} row={row.original} />,
      enableSorting: false,
      meta: { label: "Category" },
    },
    {
      accessorKey: "postedDate",
      header: ({ column }) => <DataTableColumnHeader column={column} label="Date" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {formatShortDate(row.original.postedDate, language)}
        </span>
      ),
      meta: { label: "Date" },
    },
    {
      id: "merchant",
      header: "Merchant",
      cell: ({ row }) => (
        <TransactionMerchantDisplay merchantId={row.original.merchantId} lookups={lookups} />
      ),
      enableSorting: false,
      meta: { label: "Merchant" },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Amount" className="ml-auto justify-end" />
      ),
      cell: ({ row }) => <AmountCell language={language} lookups={lookups} row={row.original} />,
      meta: { label: "Amount" },
    },
  ];
}
