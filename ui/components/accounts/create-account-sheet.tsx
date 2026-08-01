"use client"

import * as React from "react"

import { FormSheet } from "@/components/finance/forms/form-sheet"
import { CreateAccountForm } from "@/components/forms/accounts/create-account-form"
import { FormErrorBoundary } from "@/components/forms/form-error-boundary"

export function CreateAccountSheet({
  open,
  onOpenChange,
  defaultCurrencyCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCurrencyCode: string
}) {
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen)
    },
    [onOpenChange],
  )

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="New account"
      description="Add a new account and keep the details clean from the start."
      className="border-l-0 shadow-none before:hidden"
    >
      <FormErrorBoundary>
        <CreateAccountForm
          defaultCurrencyCode={defaultCurrencyCode}
          onCancel={() => handleOpenChange(false)}
          onSuccess={() => handleOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  )
}
