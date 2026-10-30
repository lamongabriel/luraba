"use client";

import { EmptyState } from "@/components/empty-state";

export function InvestmentTransactionsEmpty() {
  return (
    <EmptyState
      title="No transactions yet"
      description="Record a buy, a dividend or a deposit, or import a broker statement."
    />
  );
}
