"use client";

import type { MoneyBackEntry, Transaction, TransactionFeedRow } from "@luraba/contracts";
import { formatMoney, formatShortDate } from "@luraba/domain";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { AccountDisplay, AmountDisplay, RefundReasonDisplay } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { ComboboxControl } from "@/components/forms/form-combobox";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { SidePanelDetailRow, SidePanelSection } from "@/components/side-panel/side-panel-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { queryClient } from "@/lib/query-client";
import { useLinkRefundMutation } from "@/mutations/transactions/use-transaction-mutations";
import { useTransactionDetailQuery } from "@/queries/transactions/use-transaction-detail-query";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";
import { transactionQueryKeys } from "@/queries/transactions/use-transactions-query";
import { listTransactions } from "@/services/transactions.service";
import { useAuthSessionStore } from "@/stores/auth-session-store";

function useLanguage() {
  return useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
}

function invalidateTransactions() {
  void queryClient.invalidateQueries({ queryKey: transactionQueryKeys.all });
}

/** Skeleton with the same rows as the loaded block, so nothing shifts when the data arrives. */
function NetCostSkeleton() {
  return (
    <SidePanelSection title="Net cost">
      {["total", "back", "received", "pocket"].map((key) => (
        <div key={key} className="flex items-center justify-between py-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </SidePanelSection>
  );
}

function EntryRow({
  entry,
  lookups,
  precision,
}: {
  entry: MoneyBackEntry;
  lookups: TransactionLookups;
  precision: number;
}) {
  const language = useLanguage();
  const account =
    (entry.creditCardId
      ? lookups.creditCards.find((card) => card.id === entry.creditCardId)
      : null) ??
    lookups.accounts.find((item) => item.id === entry.accountId) ??
    null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0 space-y-1">
        <RefundReasonDisplay reason={entry.reason} size="xs" />
        <Typography variant="small-muted" className="truncate">
          {entry.description} · {formatShortDate(entry.postedDate, language)}
        </Typography>
        <AccountDisplay
          account={account}
          size="xs"
          emptyLabel={entry.accountName ?? "No account"}
        />
      </div>
      <AmountDisplay
        amount={entry.amount}
        currencyCode={entry.currencyCode}
        precision={precision}
        kind="income"
        size="xs"
      />
    </div>
  );
}

/**
 * On an expense or card purchase: what it cost, what came back (refunds, cashback, splits from any
 * account or card) and what is left out of pocket. Renders nothing when no money-back is linked.
 */
export function TransactionNetCost({
  lookups,
  precision,
  transactionId,
}: {
  lookups: TransactionLookups;
  precision: number;
  transactionId: string;
}) {
  const query = useTransactionDetailQuery(transactionId);
  if (query.isPending) return <NetCostSkeleton />;
  if (query.isError) {
    return (
      <SidePanelSection title="Net cost">
        <ErrorState
          title="Couldn’t load the net cost"
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </SidePanelSection>
    );
  }
  const moneyBack = query.data.moneyBack;
  if (!moneyBack || moneyBack.entries.length === 0) return null;
  const currencyCode = query.data.currencyCode;

  return (
    <SidePanelSection title="Net cost">
      <SidePanelDetailRow label="Total paid">
        <AmountDisplay
          amount={moneyBack.totalAmount}
          currencyCode={currencyCode}
          precision={precision}
          showSign={false}
          size="xs"
        />
      </SidePanelDetailRow>
      <div>
        <Typography variant="small-muted" className="pt-2.5">
          Received back
        </Typography>
        {moneyBack.entries.map((entry) => (
          <EntryRow
            key={entry.transactionId}
            entry={entry}
            lookups={lookups}
            precision={precision}
          />
        ))}
      </div>
      <SidePanelDetailRow label="Total received back">
        <AmountDisplay
          amount={moneyBack.receivedBack}
          currencyCode={currencyCode}
          precision={precision}
          kind="income"
          size="xs"
        />
      </SidePanelDetailRow>
      <SidePanelDetailRow label="Out of my pocket">
        <AmountDisplay
          amount={moneyBack.outOfPocket}
          currencyCode={currencyCode}
          precision={precision}
          showSign={false}
          size="xs"
          className="font-semibold"
        />
      </SidePanelDetailRow>
    </SidePanelSection>
  );
}

/** Expenses and card purchases a money-back row of this currency could be linked to. */
function usePurchaseOptions(currencyCode: string, enabled: boolean) {
  const language = useLanguage();
  return useQuery({
    enabled,
    queryKey: [...transactionQueryKeys.lists(), "link-candidates", currencyCode],
    queryFn: () =>
      listTransactions({
        originTypes: ["expense", "credit_card_installment"],
        currencyCodes: [currencyCode],
        perPage: 100,
        sort: "postedDate",
        sortDirection: "desc",
      }),
    select: (result) => {
      const seen = new Set<string>();
      return result.data.flatMap((row) => {
        if (seen.has(row.id)) return [];
        seen.add(row.id);
        return [
          {
            value: row.id,
            label: row.description,
            description: `${formatShortDate(row.purchaseDate, language)} · ${formatMoney(row.moneyBack?.totalAmount ?? row.amount, row.currencyCode)}`,
            searchText: row.merchantId ?? "",
          },
        ];
      });
    },
  });
}

/**
 * On a money-back row: the purchase it is for (a link back to it) and a way to link or unlink it.
 * `onOpenTransaction` opens the purchase in the same sheet.
 */
export function TransactionLinkedPurchase({
  onOpenTransaction,
  row,
}: {
  onOpenTransaction?: (row: TransactionFeedRow) => void;
  row: TransactionFeedRow;
}) {
  const language = useLanguage();
  const detail = useTransactionDetailQuery(row.id);
  const originalId =
    detail.data?.refund?.originalTransactionId ?? row.refund?.originalTransactionId ?? null;
  const original = useTransactionDetailQuery(originalId);
  const [picking, setPicking] = React.useState(false);
  const options = usePurchaseOptions(row.currencyCode, picking);
  const mutation = useLinkRefundMutation({
    onSuccess: () => {
      setPicking(false);
      invalidateTransactions();
    },
    errorToast: { title: "Couldn't link this money back" },
  });

  const openOriginal = async () => {
    if (!original.data || !onOpenTransaction) return;
    const result = await listTransactions({
      search: original.data.description,
      perPage: 50,
      originTypes: ["expense", "credit_card_installment"],
    });
    const found = result.data.find((item) => item.id === original.data?.id);
    if (found) onOpenTransaction(found);
  };

  if (detail.isPending || (originalId && original.isPending)) {
    return (
      <SidePanelSection title="For">
        <div className="flex items-center justify-between py-2.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-40" />
        </div>
      </SidePanelSection>
    );
  }
  if (detail.isError || original.isError) {
    return (
      <SidePanelSection title="For">
        <ErrorState
          title="Couldn’t load the linked purchase"
          description={(detail.error ?? original.error)?.message}
          onRetry={() => {
            void detail.refetch();
            void original.refetch();
          }}
        />
      </SidePanelSection>
    );
  }

  const target: Transaction | undefined = original.data;
  return (
    <SidePanelSection title="Linked purchase">
      <SidePanelDetailRow label="For">
        {target ? (
          <button
            type="button"
            className="max-w-full truncate text-right underline-offset-2 hover:underline"
            onClick={() => void openOriginal()}
          >
            {target.description} · {formatShortDate(target.purchaseDate, language)}
          </button>
        ) : (
          <span className="text-muted-foreground">Not linked to a purchase</span>
        )}
      </SidePanelDetailRow>
      <div className="flex flex-wrap items-center justify-end gap-2 py-2.5">
        {picking ? (
          <div className="w-full">
            <ComboboxControl
              id={`link-purchase-${row.id}`}
              value=""
              options={options.data ?? []}
              onChange={(value) =>
                mutation.mutate({ id: row.id, body: { originalTransactionId: value } })
              }
              disabled={mutation.isPending || options.isPending}
              placeholder={options.isPending ? "Loading purchases..." : "Choose a purchase"}
              searchPlaceholder="Search purchases..."
              emptyMessage={options.isError ? "Couldn’t load purchases." : "No purchases found."}
              contentWidth="max-content"
            />
          </div>
        ) : (
          <PermissionButton
            permission={PERMISSIONS.TRANSACTIONS_UPDATE}
            variant="outline"
            size="sm"
            onClick={() => setPicking(true)}
          >
            {target ? "Change purchase" : "Link to a purchase"}
          </PermissionButton>
        )}
        {target && !picking ? (
          <PermissionButton
            permission={PERMISSIONS.TRANSACTIONS_UPDATE}
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ id: row.id, body: { originalTransactionId: null } })}
          >
            Unlink
          </PermissionButton>
        ) : null}
      </div>
    </SidePanelSection>
  );
}
