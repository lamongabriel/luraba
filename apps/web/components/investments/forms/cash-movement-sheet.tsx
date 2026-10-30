"use client";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";

import { CashMovementForm } from "./cash-movement-form";

export function CashMovementSheet({
  open,
  onOpenChange,
  accountId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string;
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Cash movement"
      description="Deposit, withdraw, transfer or convert currency in an investment account."
    >
      <FormErrorBoundary>
        <CashMovementForm
          key={String(open)}
          accountId={accountId}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
