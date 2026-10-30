"use client";

import { ErrorState } from "@/components/error-state";

export function SplitsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load splits" description={message} onRetry={onRetry} />;
}
