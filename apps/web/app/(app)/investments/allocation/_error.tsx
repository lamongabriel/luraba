"use client";

import { ErrorState } from "@/components/error-state";

export function AllocationError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <ErrorState title="Couldn't load your allocation" description={message} onRetry={onRetry} />
  );
}
