"use client";

import type { InvestmentAccount } from "@luraba/contracts";

import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";

import { AccountForm } from "./account-form";

export function InvestmentAccountSheet({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: InvestmentAccount;
}) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={account ? "Account settings" : "New investment account"}
      description={
        account
          ? "Change how this account matches sales to purchases and estimates taxes."
          : "A brokerage, retirement or crypto account that holds your investments."
      }
    >
      <FormErrorBoundary>
        <AccountForm
          key={account?.id ?? "create"}
          account={account}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
