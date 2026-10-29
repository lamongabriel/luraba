"use client";

import { ErrorState } from "@/components/error-state";

export function MerchantsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load merchants" description={message} onRetry={onRetry} />;
}
