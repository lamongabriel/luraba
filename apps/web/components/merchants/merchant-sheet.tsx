"use client";

import type { Merchant } from "@luraba/contracts";
import { CreateEditMerchantForm } from "@/components/forms/create-edit-merchant-form/create-edit-merchant-form";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";
import { MerchantImageField } from "@/components/merchants/merchant-image-field";

export function MerchantSheet({
  open,
  onOpenChange,
  merchant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchant?: Merchant;
}) {
  const isEdit = Boolean(merchant);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit merchant" : "New merchant"}
      description={
        isEdit
          ? "Update the name, website or logo of this merchant."
          : "Add a shop or service you pay. You can upload a logo after creating it."
      }
    >
      {merchant ? (
        <div className="mb-4">
          <MerchantImageField merchant={merchant} />
        </div>
      ) : null}
      <FormErrorBoundary>
        <CreateEditMerchantForm
          // Remount the form when switching between merchants / create mode.
          key={merchant?.id ?? "create"}
          merchant={merchant}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
