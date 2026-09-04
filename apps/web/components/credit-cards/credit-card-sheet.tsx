"use client"

import type { CreditCard } from "@luraba/contracts"
import { CreateEditCreditCardForm } from "@/components/forms/create-edit-credit-card-form/create-edit-credit-card-form"
import { FormErrorBoundary } from "@/components/forms/form-error-boundary"
import { FormSheet } from "@/components/forms/form-sheet"

export function CreditCardSheet({
  card,
  defaultCurrencyCode,
  open,
  onOpenChange,
}: {
  card?: CreditCard
  defaultCurrencyCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={card ? "Edit credit card" : "Add credit card"}
      description={
        card
          ? "Update the details used to identify this card."
          : "Connect a card to an existing cash account."
      }
      className="sm:max-w-xl"
    >
      <FormErrorBoundary>
        <CreateEditCreditCardForm
          card={card}
          defaultCurrencyCode={defaultCurrencyCode}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  )
}
