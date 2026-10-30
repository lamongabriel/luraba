"use client";

import { ErrorState } from "@/components/error-state";

export function IncomeError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load your income" description={message} onRetry={onRetry} />;
}
