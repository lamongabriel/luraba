"use client";

import { Note01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  AccountDisplay,
  AmountDisplay,
  amountKindForTransactionType,
  MemberDisplay,
  MerchantMark,
  TransactionTypeDisplay,
  TransactionTypeMark,
} from "@/components/display";
import { MoneyValue } from "@/components/finance/money-value";
import { dayGroup } from "@/components/lists/day-group";
import type { MobileRowConfig } from "@/components/lists/mobile-list";
import { InlineCategoryCell } from "@/components/tables/transactions/transaction-inline-editors";
import {
  TransactionAccountDisplay,
  TransactionMerchantDisplay,
} from "@/components/tables/transactions/transaction-resource-display";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

function DetailsCell({ row }: { row: TransactionFeedRow }) {
  const details =
    row.originType === "transfer"
      ? `${row.accountName ?? "No account"}${row.toAccountName ? ` → ${row.toAccountName}` : ""}`
      : row.description;

  return (
    <div className="min-w-48 max-w-96">
      <div className="flex items-center gap-1.5">
        <span className="block truncate text-xs/4 font-medium">{details}</span>
        {row.notes ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 text-muted-foreground" role="img" aria-label="Has notes">
                <HugeiconsIcon icon={Note01Icon} strokeWidth={2} className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-80 whitespace-pre-wrap">{row.notes}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {row.originalDescription ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate text-[11px]/4 text-muted-foreground">
              {row.originalDescription}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-80 break-words">
            {row.originalDescription}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
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
      <AmountDisplay
        amount={row.amount}
        currencyCode={row.currencyCode}
        kind={amountKindForTransactionType(row.originType)}
        language={language}
        precision={precision}
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
      cell: ({ row }) => <TransactionTypeDisplay type={row.original.originType} />,
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
      id: "createdBy",
      header: "Created by",
      cell: ({ row }) => <MemberDisplay userId={row.original.createdByUserId} size="xs" />,
      enableSorting: false,
      meta: { label: "Created by" },
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

/**
 * The same transactions as a mobile list (below `md`): merchant mark, title, a small account chip,
 * amount and date, in that order and nothing else (no original statement text, no category, no
 * tags: the detail drawer has them). A note shows as a small icon. Pass as `DataTable mobile`.
 * `showAccount: false` drops the chip on a page that is already about one account.
 */
export function getTransactionsMobileRow({
  language,
  lookups,
  showAccount = true,
}: {
  language: string;
  lookups: TransactionLookups;
  showAccount?: boolean;
}): MobileRowConfig<TransactionFeedRow> {
  return {
    row: (row, { grouped }) => {
      const precision =
        lookups.currencies.find((currency) => currency.code === row.currencyCode)?.precision ?? 2;
      const merchant = row.merchantId
        ? lookups.merchants.find((item) => item.id === row.merchantId)
        : undefined;
      const account = row.creditCardId
        ? lookups.creditCards.find((item) => item.id === row.creditCardId)
        : row.accountId
          ? lookups.accounts.find((item) => item.id === row.accountId)
          : undefined;
      const title =
        row.originType === "transfer"
          ? `${row.accountName ?? "No account"}${row.toAccountName ? ` → ${row.toAccountName}` : ""}`
          : row.description;
      return {
        leading: merchant ? (
          <MerchantMark merchant={merchant} size="md" />
        ) : (
          <TransactionTypeMark type={row.originType} size="md" />
        ),
        title,
        indicators: row.notes ? (
          <span role="img" aria-label="Has notes">
            <HugeiconsIcon icon={Note01Icon} strokeWidth={2} className="size-3.5" />
          </span>
        ) : null,
        subtitle:
          showAccount && account ? (
            <AccountDisplay account={account} size="xs" />
          ) : showAccount ? (
            (row.accountName ?? "No account")
          ) : null,
        amount: (
          <AmountDisplay
            amount={row.amount}
            currencyCode={row.currencyCode}
            kind={amountKindForTransactionType(row.originType)}
            language={language}
            precision={precision}
          />
        ),
        meta: grouped ? null : formatShortDate(row.postedDate, language),
      };
    },
    group: (row) => dayGroup(row.postedDate, language),
    groupSortIds: ["postedDate"],
    ariaLabel: (row) => `View ${row.description}`,
  };
}
