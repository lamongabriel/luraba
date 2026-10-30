"use client";

import { EmptyState } from "@/components/empty-state";

export function HoldingsEmpty() {
  return (
    <EmptyState
      title="No holdings yet"
      description="Positions appear here after you record a buy or import a statement."
    />
  );
}
