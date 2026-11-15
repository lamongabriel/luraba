"use client";

import { ErrorState } from "@/components/error-state";

export function PiggyBanksError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load piggy banks" description={message} onRetry={onRetry} />;
}
