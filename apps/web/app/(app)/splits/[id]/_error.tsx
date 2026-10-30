"use client";

import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";

export function SplitDetailError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <InternalPageLayout
      title="Split"
      subtitle="Who owes what, installments and payments."
      back={{ href: "/splits", label: "Splits" }}
    >
      <ErrorState title="Split" description={message} onRetry={onRetry} />
    </InternalPageLayout>
  );
}
