"use client";

import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";

export function BillDetailError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <InternalPageLayout
      title="Bill"
      subtitle="Schedule, upcoming occurrences and payment history."
      back={{ href: "/bills", label: "Bills" }}
    >
      <ErrorState title="Bill" description={message} onRetry={onRetry} />
    </InternalPageLayout>
  );
}
