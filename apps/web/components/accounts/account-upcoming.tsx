"use client";

import type { UpcomingTransaction } from "@luraba/contracts";

import { UpcomingTransactionsPanel } from "@/components/analytics/upcoming-transactions-panel";
import { ErrorState } from "@/components/error-state";
import { PanelCardSkeleton } from "@/components/states";

import { ACCOUNT_UPCOMING_ROWS } from "./account-detail-layout";

/**
 * What is about to be charged to this account in the next 30 days (card installments and bills the
 * transactions feed attributes to it), from the shared upcoming panel.
 */
export function AccountUpcoming({
  rows,
  isPending,
  error,
  onRetry,
  language,
  precision,
}: {
  rows: UpcomingTransaction[];
  isPending: boolean;
  error: { message: string } | null;
  onRetry: () => void;
  language: string;
  precision: number;
}) {
  if (isPending)
    return <PanelCardSkeleton label="Loading upcoming charges" lines={ACCOUNT_UPCOMING_ROWS} />;
  if (error) {
    return (
      <ErrorState
        title="Couldn't load upcoming charges"
        description={error.message}
        onRetry={onRetry}
      />
    );
  }
  return (
    <UpcomingTransactionsPanel
      rows={rows.slice(0, ACCOUNT_UPCOMING_ROWS)}
      language={language}
      precision={precision}
    />
  );
}
