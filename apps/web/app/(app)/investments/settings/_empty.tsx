"use client";

import { EmptyState } from "@/components/empty-state";

export function PriceProvidersEmpty() {
  return (
    <EmptyState
      title="No price providers"
      description="Prices cannot be refreshed until a provider is configured on the server."
    />
  );
}
