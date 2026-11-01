"use client";

import { ErrorState } from "@/components/error-state";

export function BudgetError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load this budget" description={message} onRetry={onRetry} />;
}
