import type { Merchant } from "@luraba/contracts";
import { type Control, Controller } from "react-hook-form";
import { MerchantDisplay } from "@/components/display";
import { ComboboxControl } from "@/components/forms/form-combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";

const NO_MERCHANT = "__none__";

export function OptionalMerchantField({
  control,
  merchants,
}: {
  control: Control<CreateEditTransactionFormValues>;
  merchants: Merchant[];
}) {
  const options = [
    { value: NO_MERCHANT, label: "No merchant" },
    ...merchants.map((merchant) => ({ value: merchant.id, label: merchant.name })),
  ];
  const byId = new Map(merchants.map((merchant) => [merchant.id, merchant]));

  return (
    <Controller
      control={control}
      name="merchantId"
      render={({ field, fieldState }) => (
        <Field data-invalid={Boolean(fieldState.error)}>
          <FieldLabel htmlFor="merchantId">Merchant</FieldLabel>
          <ComboboxControl
            id="merchantId"
            value={field.value || NO_MERCHANT}
            options={options}
            onChange={(value) => field.onChange(value === NO_MERCHANT ? "" : value)}
            placeholder="No merchant"
            searchPlaceholder="Search merchants..."
            emptyMessage="No merchants found."
            ariaInvalid={Boolean(fieldState.error)}
            renderOption={(option) =>
              option.value === NO_MERCHANT ? (
                <span className="text-muted-foreground">No merchant</span>
              ) : (
                <MerchantDisplay merchant={byId.get(option.value)} size="sm" />
              )
            }
            renderValue={(option) =>
              option && option.value !== NO_MERCHANT ? (
                <MerchantDisplay merchant={byId.get(option.value)} size="sm" />
              ) : (
                <span className="text-muted-foreground">No merchant</span>
              )
            }
          />
          <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
        </Field>
      )}
    />
  );
}
