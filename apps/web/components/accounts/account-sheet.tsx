"use client"

import * as React from "react"
import { CreateEditAccountForm } from "@/components/forms/create-edit-account-form/create-edit-account-form"
import { FormErrorBoundary } from "@/components/forms/form-error-boundary"
import { FormSheet } from "@/components/forms/form-sheet"
import type { AccountDetails } from "@/interfaces/account"

export function AccountSheet({
  account,
  defaultCurrencyCode,
  open,
  onOpenChange,
}: {
  account?: AccountDetails
  defaultCurrencyCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = Boolean(account)

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
      title={isEdit ? "Edit account" : "New account"}
      description={
        isEdit
          ? "Update the account details while keeping ledger-safe fields locked."
          : "Add a new account and keep the details clean from the start."
      }
      className="border-l-0 shadow-none before:hidden data-[side=right]:sm:max-w-xl"
    >
      <FormErrorBoundary>
        <CreateEditAccountForm
          // Remount the form when switching between accounts / create mode.
          key={account?.id ?? "create"}
          account={account}
          defaultCurrencyCode={account?.currencyCode ?? defaultCurrencyCode}
          onCancel={() => handleOpenChange(false)}
          onSuccess={() => handleOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  )
}
