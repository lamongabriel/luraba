"use client"

import { ErrorState } from "@/components/error-state"
import { InternalPageLayout } from "@/components/finance/internal-page-layout"

export function AccountDetailsError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <InternalPageLayout title="Account">
      <ErrorState
        title="Couldn't load this account"
        description={message}
        onRetry={onRetry}
      />
    </InternalPageLayout>
  )
}
