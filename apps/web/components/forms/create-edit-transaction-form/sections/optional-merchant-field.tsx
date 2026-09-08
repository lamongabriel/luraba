import type { Merchant } from "@luraba/contracts";
import { type Control, Controller } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";

const EMPTY_MERCHANT = "__none__";

export function OptionalMerchantField({
  control,
  merchants,
}: {
  control: Control<CreateEditTransactionFormValues>;
  merchants: Merchant[];
}) {
  return (
    <Controller
      control={control}
      name="merchantId"
      render={({ field, fieldState }) => (
        <Field data-invalid={Boolean(fieldState.error)}>
          <FieldLabel htmlFor="merchantId">Merchant</FieldLabel>
          <Select
            value={field.value || EMPTY_MERCHANT}
            onValueChange={(value) => field.onChange(value === EMPTY_MERCHANT ? "" : value)}
          >
            <SelectTrigger id="merchantId" aria-invalid={Boolean(fieldState.error)}>
              <SelectValue placeholder="No merchant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_MERCHANT}>No merchant</SelectItem>
              {merchants.map((merchant) => (
                <SelectItem key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
        </Field>
      )}
    />
  );
}
