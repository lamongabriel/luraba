"use client"

import { ErrorState } from "@/components/error-state"

export function CategoriesError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <ErrorState
      title="Couldn't load categories"
      description={message}
      onRetry={onRetry}
    />
  )
}
