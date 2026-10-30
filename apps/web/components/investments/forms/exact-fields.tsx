"use client";

import type * as React from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { DateInput, MoneyInput, NumberInput } from "@/components/ui/masked-input";

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: React.ReactNode;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * A numeric field that keeps the exact decimal **string** (`"0.12345678"`) instead of a float, for
 * quantities, unit prices and rates. `kind="money"` pushes digits in from the right like every
 * amount field; `kind="decimal"` types left to right with `decimals` places.
 */
export function ExactNumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  className,
  kind = "decimal",
  decimals = 2,
  precision = 2,
}: BaseProps<T> & {
  kind?: "money" | "decimal" | "integer";
  decimals?: number;
  precision?: number;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const id = String(name);
        const value = typeof field.value === "string" ? field.value : "";
        return (
          <Field data-invalid={Boolean(fieldState.error)} className={className}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {kind === "money" ? (
              <MoneyInput
                id={id}
                name={field.name}
                ref={field.ref}
                value={value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                precision={precision}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={Boolean(fieldState.error)}
              />
            ) : (
              <NumberInput
                id={id}
                name={field.name}
                ref={field.ref}
                value={value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                decimals={kind === "integer" ? 0 : decimals}
                placeholder={placeholder}
                disabled={disabled}
                aria-invalid={Boolean(fieldState.error)}
              />
            )}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        );
      }}
    />
  );
}

/** A `YYYY-MM-DD` date field (UTC calendar day, never a local `Date`). */
export function ExactDateField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: BaseProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const id = String(name);
        return (
          <Field data-invalid={Boolean(fieldState.error)} className={className}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <DateInput
              id={id}
              name={field.name}
              ref={field.ref}
              value={typeof field.value === "string" ? field.value : ""}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              aria-invalid={Boolean(fieldState.error)}
            />
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {fieldState.error ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        );
      }}
    />
  );
}
