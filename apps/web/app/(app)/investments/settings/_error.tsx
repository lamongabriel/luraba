"use client";

import { ErrorState } from "@/components/error-state";

type RetryProps = { message?: string; onRetry: () => void };

export function InvestmentSettingsError({ message, onRetry }: RetryProps) {
  return <ErrorState title="Couldn't load the settings" description={message} onRetry={onRetry} />;
}

export function PriceProvidersError({ message, onRetry }: RetryProps) {
  return <ErrorState title="Couldn't load the providers" description={message} onRetry={onRetry} />;
}
