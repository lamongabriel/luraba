"use client";

import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/empty-state";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";

export function CreditCardsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<HugeiconsIcon icon={CreditCardIcon} strokeWidth={1.8} className="size-5" />}
      title="No credit cards yet"
      description="Add a card to follow its invoices, installments and remaining limit."
      action={
        <PermissionButton
          permission={PERMISSIONS.CREDIT_CARDS_CREATE}
          deniedMessage="Your household role cannot add credit cards."
          onClick={onCreate}
        >
          Add your first card
        </PermissionButton>
      }
    />
  );
}
