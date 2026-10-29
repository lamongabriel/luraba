"use client";

import type { Merchant } from "@luraba/contracts";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import { useCreateEditMerchantForm } from "./use-create-edit-merchant-form";

export function CreateEditMerchantForm({
  merchant,
  onCancel,
  onSuccess,
}: {
  merchant?: Merchant;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { form, onSubmit, isEdit, isPending, errorMessage } = useCreateEditMerchantForm({
    merchant,
    onSuccess,
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Whole Foods"
        disabled={isPending}
      />
      <FormItem
        control={form.control}
        name="domain"
        label="Website"
        placeholder="wholefoodsmarket.com"
        description="Used to load a logo when Brandfetch is configured. An uploaded logo takes priority."
        disabled={isPending}
      />

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating..."}
        >
          {isEdit ? "Save changes" : "Create merchant"}
        </Button>
      </div>
    </form>
  );
}
