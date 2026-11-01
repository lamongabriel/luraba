"use client";

import type {
  CreditCardOverviewCard,
  ListTransactionsQuery,
  TransactionFeedRow,
} from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import * as React from "react";
import { AmountDisplay, DisplayMark } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageSection } from "@/components/finance/page-section";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

export const RECENT_PURCHASES_COUNT = 5;
const ROW_CLASS = "flex h-14 items-center gap-3";
const VIEW_ALL_HREF = "/transactions?originTypes=credit_card_installment";

const viewAll = (
  <Link href={VIEW_ALL_HREF} className="text-xs font-medium text-primary hover:underline">
    View all
  </Link>
);

/**
 * The five most recent card purchases on the month's invoices: what, which card, when and how
 * much. No sorting or filters; "View all" opens the transactions page on card purchases.
 */
export function RecentPurchases({
  cycleIds,
  cards,
  language,
  onView,
}: {
  cycleIds: string[];
  cards: CreditCardOverviewCard[];
  language: string;
  onView: (row: TransactionFeedRow) => void;
}) {
  const precisionOf = useCurrencyPrecision();
  const filters = React.useMemo<ListTransactionsQuery>(
    () =>
      ({
        originTypes: ["credit_card_installment"],
        billingCycleIds: cycleIds,
        page: 1,
        perPage: RECENT_PURCHASES_COUNT,
        sort: "purchaseDate",
        sortDirection: "desc",
      }) as ListTransactionsQuery,
    [cycleIds],
  );
  const query = useTransactionsQuery(filters, { enabled: cycleIds.length > 0 });
  const rows = query.data?.data ?? [];

  let body: React.ReactNode;
  if (cycleIds.length === 0 || (query.data && rows.length === 0)) {
    body = (
      <EmptyState
        variant="embedded"
        title="No purchases yet"
        description="Card purchases on this month's invoices appear here."
      />
    );
  } else if (query.isError) {
    body = (
      <ErrorState
        title="Couldn't load purchases"
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (!query.data) {
    body = <RecentPurchasesRows />;
  } else {
    body = (
      <ul className="divide-y divide-border/60" aria-label="Recent purchases">
        {rows.map((row) => {
          const card = cards.find((item) => item.creditCardId === row.creditCardId);
          return (
            <li key={row.rowId}>
              <button
                type="button"
                onClick={() => onView(row)}
                className={`${ROW_CLASS} w-full rounded-md text-left transition-colors hover:bg-muted/40`}
              >
                {card ? (
                  <DisplayMark imageUrl={card.institutionLogoUrl} color={card.color} size="sm" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.description}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatShortDate(row.purchaseDate, language)}
                    {card ? ` · ${card.name} ••${card.last4}` : ""}
                  </span>
                </span>
                <AmountDisplay
                  amount={row.amount}
                  currencyCode={row.currencyCode}
                  kind="expense"
                  language={language}
                  precision={precisionOf(row.currencyCode)}
                />
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <PageSection
      divider
      title="Recent purchases"
      description="On this month's invoices"
      actions={viewAll}
    >
      {body}
    </PageSection>
  );
}

function RecentPurchasesRows() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading purchases" className="space-y-px">
      {Array.from({ length: RECENT_PURCHASES_COUNT }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Loading twin of `RecentPurchases`. */
export function RecentPurchasesSkeleton() {
  return (
    <PageSection
      divider
      title="Recent purchases"
      description="On this month's invoices"
      actions={viewAll}
    >
      <RecentPurchasesRows />
    </PageSection>
  );
}
