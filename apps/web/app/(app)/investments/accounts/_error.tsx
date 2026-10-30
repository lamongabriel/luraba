"use client";

import { ErrorState } from "@/components/error-state";

export function InvestmentAccountsError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return <ErrorState title="Couldn't load your accounts" description={message} onRetry={onRetry} />;
}
