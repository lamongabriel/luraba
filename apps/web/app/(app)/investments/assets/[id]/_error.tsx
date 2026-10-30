"use client";

import { ErrorState } from "@/components/error-state";

export function InvestmentAssetDetailError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return <ErrorState title="Couldn't load this asset" description={message} onRetry={onRetry} />;
}
