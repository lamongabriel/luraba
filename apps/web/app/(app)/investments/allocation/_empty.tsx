"use client";

import { EmptyState } from "@/components/empty-state";

export function AllocationEmpty() {
  return (
    <EmptyState
      title="Nothing to allocate yet"
      description="Your allocation appears here once you hold investments."
    />
  );
}
