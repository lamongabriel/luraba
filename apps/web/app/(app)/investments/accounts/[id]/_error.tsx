"use client";

import { ErrorState } from "@/components/error-state";

export function InvestmentAccountDetailError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return <ErrorState title="Couldn't load this account" description={message} onRetry={onRetry} />;
}
