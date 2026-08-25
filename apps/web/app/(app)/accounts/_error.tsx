"use client"

import { ErrorState } from "@/components/error-state"

export function AccountsError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <ErrorState
      title="Couldn't load accounts"
      description={message}
      onRetry={onRetry}
    />
  )
}
