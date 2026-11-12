"use client";

import { ErrorState } from "@/components/error-state";

export function GoalsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load goals" description={message} onRetry={onRetry} />;
}
