"use client";

import { ErrorState } from "@/components/error-state";

export function TagsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load tags" description={message} onRetry={onRetry} />;
}
