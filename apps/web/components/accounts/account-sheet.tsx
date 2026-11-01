"use client";

import type { AccountDetails } from "@luraba/contracts";
import * as React from "react";
import { AccountImageField } from "@/components/accounts/account-image-field";
import { AccountManageSection } from "@/components/accounts/account-manage-section";
import { CreateEditAccountForm } from "@/components/forms/create-edit-account-form/create-edit-account-form";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";

export function AccountSheet({
  account,
  defaultCurrencyCode,
  open,
  onOpenChange,
  onDeleted,
}: {
  account?: AccountDetails;
  defaultCurrencyCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the account was deleted from the edit sheet (the sheet is already closing). */
  onDeleted?: () => void;
}) {
  const isEdit = Boolean(account);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? "Edit account" : "New account"}
      description={
        isEdit
          ? "Update the details, adjust the balance or delete the account."
          : "Add a new account and keep the details clean from the start."
      }
      className="border-l-0 shadow-none before:hidden data-[side=right]:sm:max-w-xl"
    >
      {account ? (
        <div className="mb-4">
          <AccountImageField account={account} />
        </div>
      ) : null}
      <FormErrorBoundary>
        <CreateEditAccountForm
          // Remount the form when switching between accounts / create mode.
          key={account?.id ?? "create"}
          account={account}
          defaultCurrencyCode={account?.currencyCode ?? defaultCurrencyCode}
          onCancel={() => handleOpenChange(false)}
          onSuccess={() => handleOpenChange(false)}
          editExtras={
            account ? (
              <AccountManageSection
                account={account}
                onDeleted={() => {
                  handleOpenChange(false);
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
