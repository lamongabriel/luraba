import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Product } from "@luraba/contracts";
import { type Control, Controller, useFieldArray, useFormState, useWatch } from "react-hook-form";
import { AmountDisplay } from "@/components/display";
import { ProductPicker } from "@/components/products/product-picker";
import { Button } from "@/components/ui/button";
import { MoneyInput, NumberInput } from "@/components/ui/masked-input";
import { Typography } from "@/components/ui/typography";
import { minorToMajorUnits } from "@/lib/finance";
import { itemsTotalMinor, remainingToAllocate } from "@/lib/transaction-items";
import { cn } from "@/lib/utils";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { TransactionFormSection } from "./transaction-form-section";

type ItemsControl = Control<CreateEditTransactionFormValues>;

const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_4rem_6.5rem_1.75rem] items-start gap-2";

function ItemRow({
  index,
  control,
  products,
  currencyCode,
  precisionOf,
  onRemove,
  onPick,
}: {
  index: number;
  control: ItemsControl;
  products: readonly Product[];
  currencyCode: string | undefined;
  precisionOf: (code: string | undefined) => number;
  onRemove: () => void;
  onPick: (product: Product) => void;
}) {
  return (
    <div className="space-y-1">
      <div className={ROW_GRID}>
        <Controller
          control={control}
          name={`items.${index}.name`}
          render={({ field, fieldState }) => (
            <ItemProductField
              control={control}
              index={index}
              text={field.value}
              products={products}
              invalid={Boolean(fieldState.error)}
              precisionOf={precisionOf}
              onBlur={field.onBlur}
              onChange={field.onChange}
              onPick={onPick}
            />
          )}
        />
        <Controller
          control={control}
          name={`items.${index}.quantity`}
          render={({ field, fieldState }) => (
            <NumberInput
              id={field.name}
              aria-label="Quantity"
              value={field.value}
              aria-invalid={Boolean(fieldState.error)}
              onBlur={field.onBlur}
              onValueChange={(value) => field.onChange(value === "" ? "" : Number(value))}
            />
          )}
        />
        <Controller
          control={control}
          name={`items.${index}.unitPrice`}
          render={({ field, fieldState }) => (
            <MoneyInput
              id={field.name}
              aria-label={`Price each${currencyCode ? ` (${currencyCode})` : ""}`}
              value={field.value}
              precision={precisionOf(currencyCode)}
              aria-invalid={Boolean(fieldState.error)}
              onBlur={field.onBlur}
              onValueChange={(value) => field.onChange(value === "" ? "" : Number(value))}
            />
          )}
        />
        <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          <span className="sr-only">Remove item</span>
        </Button>
      </div>
      <ItemRowErrors control={control} index={index} />
    </div>
  );
}

function ItemProductField({
  control,
  index,
  text,
  products,
  invalid,
  precisionOf,
  onBlur,
  onChange,
  onPick,
}: {
  control: ItemsControl;
  index: number;
  text: string;
  products: readonly Product[];
  invalid: boolean;
  precisionOf: (code: string | undefined) => number;
  onBlur: () => void;
  onChange: (value: string) => void;
  onPick: (product: Product) => void;
}) {
  const productId = useWatch({ control, name: `items.${index}.productId` });
  return (
    <Controller
      control={control}
      name={`items.${index}.productId`}
      render={({ field: productField }) => (
        <ProductPicker
          id={`items.${index}.name`}
          text={text}
          products={products}
          linkedProductId={productId || undefined}
          precisionOf={precisionOf}
          invalid={invalid}
          onBlur={onBlur}
          onTextChange={(next) => {
            if (productField.value) productField.onChange("");
            onChange(next);
          }}
          onPick={onPick}
        />
      )}
    />
  );
}

function ItemRowErrors({ control, index }: { control: ItemsControl; index: number }) {
  const { errors } = useFormState({ control, name: `items.${index}` });
  const rowErrors = errors.items?.[index];
  const message =
    rowErrors?.name?.message ?? rowErrors?.quantity?.message ?? rowErrors?.unitPrice?.message;
  return message ? <Typography variant="small-destructive">{message}</Typography> : null;
}

/**
 * Optional list of what the transaction bought, one compact row per item. The name field suggests
 * saved products (picture and latest price) as you type; picking one fills the price, a new name is
 * saved as a product when the transaction is saved. The items may not add up to more than the
 * transaction amount, and the header shows what is left to allocate.
 */
export function ItemsSection({
  control,
  products,
  currencyCode,
  precisionOf,
  productPrecisionOf,
}: {
  control: ItemsControl;
  products: readonly Product[];
  /** The transaction's currency; items are priced in it. */
  currencyCode: string | undefined;
  precisionOf: (code: string | undefined) => number;
  productPrecisionOf: (code: string | undefined) => number;
}) {
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const amount = useWatch({ control, name: "amount" });
  const precision = precisionOf(currencyCode);
  const totalMinor = Math.round((Number(amount) || 0) * 10 ** precision);
  const allocatedMinor = itemsTotalMinor(items, precision);
  const remaining = remainingToAllocate(totalMinor, allocatedMinor);
  const over = remaining < 0;
  const { errors } = useFormState({ control, name: "items" });
  const listError = errors.items?.message ?? errors.items?.root?.message;

  const pick = (index: number, product: Product) => {
    const current = items[index];
    const samePrice = product.price != null && product.currencyCode === currencyCode;
    update(index, {
      ...current,
      productId: product.id,
      name: product.name,
      unitPrice: samePrice
        ? minorToMajorUnits(product.price as number, productPrecisionOf(product.currencyCode))
        : current.unitPrice,
      saveAsProductPrice: true,
    });
  };

  return (
    <TransactionFormSection title="Items">
      {fields.length > 0 ? (
        <div className="space-y-2">
          <div className={cn(ROW_GRID, "text-[0.65rem] font-medium text-muted-foreground")}>
            <span>Product</span>
            <span>Qty</span>
            <span>Price{currencyCode ? ` (${currencyCode})` : ""}</span>
            <span />
          </div>
          {fields.map((field, index) => (
            <ItemRow
              key={field.id}
              index={index}
              control={control}
              products={products}
              currencyCode={currencyCode}
              precisionOf={precisionOf}
              onRemove={() => remove(index)}
              onPick={(product) => pick(index, product)}
            />
          ))}
        </div>
      ) : null}
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
              saveAsProductPrice: true,
            })
          }
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add item
        </Button>
        {items.length > 0 && currencyCode && totalMinor > 0 ? (
          <Typography
            variant={over ? "small-destructive" : "small-muted"}
            aria-live="polite"
            data-testid="items-remaining"
          >
            {over ? "Over by " : "Remaining to allocate: "}
            <AmountDisplay
              amount={Math.abs(remaining)}
              currencyCode={currencyCode}
              precision={precision}
              showSign={false}
              size="xs"
              kind="neutral"
            />
          </Typography>
        ) : null}
      </div>
      {listError ? <Typography variant="small-destructive">{listError}</Typography> : null}
    </TransactionFormSection>
  );
}
