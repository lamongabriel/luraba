"use client";

import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";

export function CreditCardDetailError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <InternalPageLayout
      title="Credit card"
      subtitle="Invoices, limit and the purchases behind each one."
      back={{ href: "/credit-cards", label: "Credit cards" }}
    >
      <ErrorState title="Credit card" description={message} onRetry={onRetry} />
    </InternalPageLayout>
  );
}

export function InvoicesError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return <ErrorState title="Couldn't load invoices" description={message} onRetry={onRetry} />;
}
