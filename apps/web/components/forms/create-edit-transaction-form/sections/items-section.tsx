import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Product } from "@luraba/contracts";
import * as React from "react";
import { type Control, Controller, useFieldArray, useWatch } from "react-hook-form";
import { AmountDisplay, ProductDisplay } from "@/components/display";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { ProductSheet } from "@/components/products/product-sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput, NumberInput } from "@/components/ui/masked-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Typography } from "@/components/ui/typography";
import { minorToMajorUnits } from "@/lib/finance";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { TransactionFormSection } from "./transaction-form-section";

const CUSTOM_ITEM = "__custom__";

type ItemsControl = Control<CreateEditTransactionFormValues>;

function ItemRow({
  index,
  control,
  products,
  currencyCode,
  precisionOf,
  productPrecisionOf,
  onRemove,
  onEditProduct,
  onProductPicked,
}: {
  index: number;
  control: ItemsControl;
  products: Product[];
  currencyCode: string | undefined;
  precisionOf: (code: string | undefined) => number;
  productPrecisionOf: (code: string | undefined) => number;
  onRemove: () => void;
  onEditProduct: (product: Product) => void;
  onProductPicked: (productId: string, product: Product | undefined) => void;
}) {
  const productId = useWatch({ control, name: `items.${index}.productId` });
  const name = useWatch({ control, name: `items.${index}.name` });
  const product = products.find((p) => p.id === productId);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field>
          <FieldLabel htmlFor={`items.${index}.productId`}>Product</FieldLabel>
          <Select
            value={productId || CUSTOM_ITEM}
            onValueChange={(value) =>
              onProductPicked(
                value === CUSTOM_ITEM ? "" : value,
                products.find((p) => p.id === value),
              )
            }
          >
            <SelectTrigger id={`items.${index}.productId`}>
              <SelectValue placeholder="Something else" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CUSTOM_ITEM}>Something else (type a name)</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <ProductDisplay
                    product={p}
                    size="xs"
                    detail={
                      p.price != null ? (
                        <AmountDisplay
                          amount={p.price}
                          currencyCode={p.currencyCode}
                          precision={productPrecisionOf(p.currencyCode)}
                          showSign={false}
                          size="xs"
                        />
                      ) : undefined
                    }
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="self-end"
          onClick={onRemove}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          <span className="sr-only">Remove item</span>
        </Button>
      </div>

      {product ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start p-0 text-xs"
          onClick={() => onEditProduct(product)}
        >
          Edit picture or name
        </Button>
      ) : null}

      {productId ? null : (
        <Controller
          control={control}
          name={`items.${index}.name`}
          render={({ field, fieldState }) => (
            <Field data-invalid={Boolean(fieldState.error)}>
              <FieldLabel htmlFor={field.name}>Item name</FieldLabel>
              <Input
                id={field.name}
                value={field.value}
                placeholder="Lightning cable"
                aria-invalid={Boolean(fieldState.error)}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value)}
              />
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name={`items.${index}.quantity`}
          render={({ field, fieldState }) => (
            <Field data-invalid={Boolean(fieldState.error)}>
              <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
              <NumberInput
                id={field.name}
                value={field.value}
                aria-invalid={Boolean(fieldState.error)}
                onBlur={field.onBlur}
                onValueChange={(value) => field.onChange(value === "" ? "" : Number(value))}
              />
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name={`items.${index}.unitPrice`}
          render={({ field, fieldState }) => (
            <Field data-invalid={Boolean(fieldState.error)}>
              <FieldLabel htmlFor={field.name}>
                Price each{currencyCode ? ` (${currencyCode})` : ""}
              </FieldLabel>
              <MoneyInput
                id={field.name}
                value={field.value}
                precision={precisionOf(currencyCode)}
                aria-invalid={Boolean(fieldState.error)}
                onBlur={field.onBlur}
                onValueChange={(value) => field.onChange(value === "" ? "" : Number(value))}
              />
              <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
            </Field>
          )}
        />
      </div>

      {productId || name.trim() ? (
        <Controller
          control={control}
          name={`items.${index}.saveAsProductPrice`}
          render={({ field }) => (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch id={field.name} checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor={field.name} className="text-xs font-normal text-muted-foreground">
                {product
                  ? `Update ${product.name}'s saved price to this one`
                  : "Save as a product with this price"}
              </Label>
            </div>
          )}
        />
      ) : null}
    </div>
  );
}

/**
 * Optional list of what the transaction bought. Pick a saved product (its latest price is
 * suggested) or type a name; switch on "save price" to keep this price on the product for next time.
 */
export function ItemsSection({
  control,
  products,
  currencyCode,
  precisionOf,
  productPrecisionOf,
}: {
  control: ItemsControl;
  products: Product[];
  /** The transaction's currency; items are priced in it. */
  currencyCode: string | undefined;
  precisionOf: (code: string | undefined) => number;
  productPrecisionOf: (code: string | undefined) => number;
}) {
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const [sheet, setSheet] = React.useState<{ open: boolean; product?: Product; row?: number }>({
    open: false,
  });
  const totalMinor = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + Math.round(quantity * price * 10 ** precisionOf(currencyCode));
  }, 0);

  const pick = (index: number, productId: string, product: Product | undefined) => {
    const current = items[index];
    const samePrice = product?.price != null && product.currencyCode === currencyCode;
    update(index, {
      ...current,
      productId,
      name: product?.name ?? (productId ? current.name : ""),
      unitPrice: samePrice
        ? minorToMajorUnits(product.price as number, productPrecisionOf(product.currencyCode))
        : current.unitPrice,
      saveAsProductPrice: false,
    });
  };

  return (
    <TransactionFormSection
      title="Items"
      description="Optional. List what you bought so you can track it and reuse it later."
    >
      {fields.map((field, index) => (
        <ItemRow
          key={field.id}
          index={index}
          control={control}
          products={products}
          currencyCode={currencyCode}
          precisionOf={precisionOf}
          productPrecisionOf={productPrecisionOf}
          onRemove={() => remove(index)}
          onEditProduct={(p) => setSheet({ open: true, product: p, row: index })}
          onProductPicked={(productId, product) => pick(index, productId, product)}
        />
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              productId: "",
              name: "",
              quantity: 1,
              unitPrice: "" as never,
              saveAsProductPrice: false,
            })
          }
        >
          Add item
        </Button>
        <PermissionButton
          permission={PERMISSIONS.PRODUCTS_CREATE}
          deniedMessage="Your household role cannot create products."
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSheet({ open: true })}
        >
          New product
        </PermissionButton>
        {items.length > 0 && currencyCode ? (
          <Typography variant="small-muted">
            Items total{" "}
            <AmountDisplay
              amount={totalMinor}
              currencyCode={currencyCode}
              precision={precisionOf(currencyCode)}
              showSign={false}
              size="xs"
            />
          </Typography>
        ) : null}
      </div>
      <ProductSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        product={sheet.product}
        onSaved={(saved) => {
          if (sheet.row === undefined) return;
          pick(sheet.row, saved.id, saved);
        }}
      />
    </TransactionFormSection>
  );
}
