"use client";

import { ErrorState } from "@/components/error-state";

export function TaxesError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <ErrorState title="Couldn't load your tax report" description={message} onRetry={onRetry} />
  );
}
