"use client";

import { ErrorState } from "@/components/error-state";

export function HoldingsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load your holdings" description={message} onRetry={onRetry} />;
}
