"use client";

import type * as React from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/** Props every catalog select takes, mirroring `FormItem`. */
export type CatalogSelectFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: React.ReactNode;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  labelAdornment?: React.ReactNode;
  triggerClassName?: string;
};

/** Props of the uncontrolled-by-form variants (`*SelectControl`): plain value and onChange. */
export type CatalogSelectControlProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  triggerClassName?: string;
};

/**
 * The `FormItem` chrome (label, description, error) around any catalog select control, so each
 * `*Select` is a few lines: pass the control renderer.
 */
export function CatalogSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  labelAdornment,
  render,
}: Pick<
  CatalogSelectFieldProps<TFieldValues>,
  "control" | "name" | "label" | "description" | "className" | "labelAdornment"
> & {
  render: (field: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    ariaInvalid: boolean;
  }) => React.ReactNode;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const hasError = Boolean(fieldState.error);
        const id = String(name);
        return (
          <Field data-invalid={hasError} className={className}>
            <FieldLabel htmlFor={id} className="items-center gap-1.5">
              <span>{label}</span>
              {labelAdornment}
            </FieldLabel>
            {render({
              id,
              value: typeof field.value === "string" ? field.value : "",
              onChange: field.onChange,
              ariaInvalid: hasError,
            })}
            {description && !hasError ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
          </Field>
        );
      }}
    />
  );
}
