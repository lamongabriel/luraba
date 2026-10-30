"use client";

import { ErrorState } from "@/components/error-state";

export function CreditCardsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load credit cards" description={message} onRetry={onRetry} />;
}
