"use client";

import { ErrorState } from "@/components/error-state";

export function InvestmentTransactionsError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return <ErrorState title="Couldn't load transactions" description={message} onRetry={onRetry} />;
}
