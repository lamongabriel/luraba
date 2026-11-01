"use client";

import { ErrorState } from "@/components/error-state";

export function BudgetsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load the budgets" description={message} onRetry={onRetry} />;
}
