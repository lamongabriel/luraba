"use client";

import type { Product } from "@luraba/contracts";
import * as React from "react";
import { CreateEditProductForm } from "@/components/forms/create-edit-product-form/create-edit-product-form";
import { FormErrorBoundary } from "@/components/forms/form-error-boundary";
import { FormSheet } from "@/components/forms/form-sheet";
import { ProductImageField } from "@/components/products/product-image-field";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";

export function ProductSheet({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSaved?: (product: Product) => void;
}) {
  const defaultCurrency = useDefaultCurrencyCode();
  // After creating, stay open on the new product so its picture can be added right away.
  const [created, setCreated] = React.useState<Product>();
  const current = product ?? created;
  const isEdit = Boolean(current);

  React.useEffect(() => {
    if (!open) setCreated(undefined);
  }, [open]);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit product" : "New product"}
      description={
        isEdit
          ? "Update the name, picture or latest price of this product."
          : "Add something you buy often. You can add a picture after creating it."
      }
    >
      {current ? (
        <div className="mb-4">
          <ProductImageField product={current} />
        </div>
      ) : null}
      <FormErrorBoundary>
        <CreateEditProductForm
          key={current?.id ?? "create"}
          product={current}
          currencyCode={defaultCurrency}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved, isNew) => {
            onSaved?.(saved);
            if (isNew) setCreated(saved);
            else onOpenChange(false);
          }}
        />
      </FormErrorBoundary>
    </FormSheet>
  );
}
