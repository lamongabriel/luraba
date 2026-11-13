"use client";

import type { ListTransactionsQuery, TransactionFeedRow } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";
import * as React from "react";
import { CategoryDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageSection } from "@/components/finance/page-section";
import { ListRow, ListSkeleton } from "@/components/lists";
import { getTransactionsMobileRow } from "@/components/tables/transactions/transactions-table.config";
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query";
import { useTransactionsQuery } from "@/queries/transactions/use-transactions-query";

export const RECENT_CARD_TRANSACTIONS_COUNT = 6;
const VIEW_ALL_HREF = "/transactions?originTypes=credit_card_installment";

const viewAll = (
  <Link href={VIEW_ALL_HREF} className="text-xs font-medium text-primary hover:underline">
    View all
  </Link>
);

const TITLE = "Recent transactions";
const DESCRIPTION = "Card purchases on the month's statements";

/**
 * The latest card purchases on the selected month's statements, across every card, as the shared list
 * rows: merchant mark, description, the date and the card, the amount and the category. A tap opens the
 * regular transaction drawer.
 */
export function RecentCardTransactions({
  cycleIds,
  language,
  onView,
}: {
  /** The statements due in the selected month (one per card). */
  cycleIds: string[];
  language: string;
  onView: (row: TransactionFeedRow) => void;
}) {
  const lookupsQuery = useTransactionLookupsQuery();
  const lookups = lookupsQuery.data;
  const filters = React.useMemo<ListTransactionsQuery>(
    () =>
      ({
        originTypes: ["credit_card_installment"],
        billingCycleIds: cycleIds,
        page: 1,
        perPage: RECENT_CARD_TRANSACTIONS_COUNT,
        sort: "purchaseDate",
        sortDirection: "desc",
      }) as ListTransactionsQuery,
    [cycleIds],
  );
  const query = useTransactionsQuery(filters, { enabled: cycleIds.length > 0 });
  const rows = query.data?.data ?? [];
  const config = React.useMemo(
    () => (lookups ? getTransactionsMobileRow({ language, lookups }) : null),
    [language, lookups],
  );

  let body: React.ReactNode;
  if (cycleIds.length === 0 || (query.data && rows.length === 0)) {
    body = (
      <EmptyState
        variant="embedded"
        title="No transactions yet"
        description="Card purchases on this month's statements appear here."
      />
    );
  } else if (query.isError) {
    body = (
      <ErrorState
        title="Couldn't load transactions"
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (!query.data || !config || !lookups) {
    body = <RecentCardTransactionsRows />;
  } else {
    body = (
      <ul aria-label={TITLE}>
        {rows.map((row) => {
          const base = config.row(row, { grouped: false });
          const category = lookups.categories.find((item) => item.id === row.categoryId);
          const card = lookups.creditCards.find((item) => item.id === row.creditCardId);
          return (
            <li key={row.rowId}>
              <ListRow
                {...base}
                subtitle={
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0">{formatShortDate(row.purchaseDate, language)}</span>
                    {card ? <span aria-hidden="true">·</span> : null}
                    {base.subtitle}
                  </span>
                }
                meta={
                  category ? (
                    <CategoryDisplay category={category} variant="inline" size="xs" />
                  ) : null
                }
                onClick={() => onView(row)}
                ariaLabel={`View ${row.description}`}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <PageSection title={TITLE} description={DESCRIPTION} actions={viewAll}>
      {body}
    </PageSection>
  );
}

function RecentCardTransactionsRows() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading transactions">
      <ListSkeleton rows={RECENT_CARD_TRANSACTIONS_COUNT} />
    </div>
  );
}

/** Loading twin of `RecentCardTransactions`: the same section header and rows. */
export function RecentCardTransactionsSkeleton() {
  return (
    <PageSection title={TITLE} description={DESCRIPTION} actions={viewAll}>
      <RecentCardTransactionsRows />
    </PageSection>
  );
}
