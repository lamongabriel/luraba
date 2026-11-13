"use client";

import type { CreditCard } from "@luraba/contracts";
import { CreditCardManageSection } from "@/components/credit-cards/credit-card-manage-section";
import { CreateEditCreditCardForm } from "@/components/forms/create-edit-credit-card-form/create-edit-credit-card-form";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";
import { FALLBACK_CURRENCY_CODE } from "@/lib/finance";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/** Create or edit a credit card (name, brand, color, closing and due day, limit); edit can delete. */
export function CreditCardSheet({
  open,
  onOpenChange,
  card,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
  /** Called after the card was deleted from the edit sheet (the sheet is already closing). */
  onDeleted?: () => void;
}) {
  const defaultCurrencyCode = useAuthSessionStore(
    (state) => state.user?.preferences.currency ?? FALLBACK_CURRENCY_CODE,
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={card ? "Edit credit card" : "Add credit card"}
      description={
        card
          ? "Change how the card looks, when its invoice closes and is due, or its limit."
          : "Add a card to track its invoices, installments and limit."
      }
    >
      <FormErrorBoundary>
        <CreateEditCreditCardForm
          key={card?.id ?? "new"}
          card={card}
          defaultCurrencyCode={defaultCurrencyCode}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
          editExtras={
            card ? (
              <CreditCardManageSection
                card={card}
                onDeleted={() => {
                  onOpenChange(false);
                  onDeleted?.();
                }}
              />
            ) : null
          }
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
