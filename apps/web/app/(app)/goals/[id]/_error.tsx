"use client";

import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";

export function GoalDetailError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <InternalPageLayout
      title="Goal"
      subtitle="Progress, monthly plan and contributions."
      back={{ href: "/goals", label: "Goals" }}
    >
      <ErrorState title="Goal" description={message} onRetry={onRetry} />
    </InternalPageLayout>
  );
}
