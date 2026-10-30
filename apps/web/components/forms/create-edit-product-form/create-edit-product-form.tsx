"use client";

import type { Product } from "@luraba/contracts";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import { useCreateEditProductForm } from "./use-create-edit-product-form";

export function CreateEditProductForm({
  product,
  currencyCode,
  onCancel,
  onSaved,
}: {
  product?: Product;
  currencyCode: string;
  onCancel: () => void;
  onSaved: (product: Product, isNew: boolean) => void;
}) {
  const {
    form,
    onSubmit,
    isEdit,
    isPending,
    errorMessage,
    currencyCode: priceCurrency,
  } = useCreateEditProductForm({ product, currencyCode, onSaved });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Cheeseburger"
        disabled={isPending}
      />
      <FormItem
        control={form.control}
        name="price"
        label={`Price (${priceCurrency})`}
        inputType="money"
        description="The latest price you paid. It changes per store, so edit it any time."
        disabled={isPending}
      />

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          {isEdit ? "Cancel" : "Close"}
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating..."}
        >
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
