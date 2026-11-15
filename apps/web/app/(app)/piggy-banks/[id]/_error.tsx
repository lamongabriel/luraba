"use client";

import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";

export function PiggyBankDetailError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <InternalPageLayout
      title="Piggy bank"
      subtitle="Balance, interest and movements."
      back={{ href: "/piggy-banks", label: "Piggy banks" }}
    >
      <ErrorState title="Couldn't load this piggy bank" description={message} onRetry={onRetry} />
    </InternalPageLayout>
  );
}
