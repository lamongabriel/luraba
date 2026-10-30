"use client";

import { EmptyState } from "@/components/empty-state";

export function IncomeEmpty() {
  return (
    <EmptyState
      title="No income in this period"
      description="Dividends, interest on equity, coupons and fund income show up here."
    />
  );
}
