"use client";

import { EmptyState } from "@/components/empty-state";

export function TaxesEmpty({ year }: { year: number | string }) {
  return (
    <EmptyState
      title={`No taxable activity in ${year}`}
      description="Sales, income and holdings for the year appear here once you have transactions."
    />
  );
}
