"use client";

import { ErrorState } from "@/components/error-state";

export function ApiKeysError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load API keys" description={message} onRetry={onRetry} />;
}
