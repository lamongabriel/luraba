"use client";

import { ErrorState } from "@/components/error-state";

export function PlanError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <ErrorState
      title="Couldn't work out what is left to spend"
      description={message}
      onRetry={onRetry}
    />
  );
}
