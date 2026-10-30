"use client";

import { ErrorState } from "@/components/error-state";

export function InvestmentsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <ErrorState title="Couldn't load your investments" description={message} onRetry={onRetry} />
  );
}
