"use client";

import { ErrorState } from "@/components/error-state";

export default function CreditCardsErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState title="Couldn’t load credit cards" description={error.message} onRetry={reset} />
  );
}
