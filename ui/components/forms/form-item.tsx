"use client"

import type { Control, FieldValues, Path } from "react-hook-form"
import { Controller } from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type FormItemProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  name: Path<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
  autoComplete?: string
  inputType?: "text" | "email" | "password"
  className?: string
  inputClassName?: string
}

export function FormItem<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled,
  autoComplete,
  inputType = "text",
  className,
  inputClassName,
}: FormItemProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const hasError = Boolean(fieldState.error)
        const inputId = String(name)

        return (
          <Field data-invalid={hasError} className={className}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <Input
              {...field}
              id={inputId}
              type={inputType}
              value={typeof field.value === "string" ? field.value : (field.value ?? "")}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={hasError}
              className={inputClassName}
            />
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
          </Field>
        )
      }}
    />
  )
}
