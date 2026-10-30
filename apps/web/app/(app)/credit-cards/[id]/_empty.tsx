"use client";

import { EmptyState } from "@/components/empty-state";

export function InvoicesEmpty() {
  return (
    <EmptyState
      title="No invoices yet"
      description="This card has no invoices yet. They appear once it has purchases."
      className="min-h-48"
    />
  );
}
