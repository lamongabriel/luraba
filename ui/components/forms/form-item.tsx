"use client"

import * as React from "react"
import type { Control, FieldValues, Path } from "react-hook-form"
import { Controller } from "react-hook-form"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { FormComboboxOption } from "@/components/forms/form-combobox"
import { ComboboxControl } from "@/components/forms/form-combobox"

type BaseFormItemProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  name: Path<TFieldValues>
  label: React.ReactNode
  placeholder?: string
  description?: string
  disabled?: boolean
  apiError?: string
  autoComplete?: string
  className?: string
  labelAdornment?: React.ReactNode
}

type InputFormItemProps<TFieldValues extends FieldValues> = BaseFormItemProps<TFieldValues> & {
  type?: "input"
  inputType?: "text" | "email" | "password" | "number"
  step?: string
  readOnly?: boolean
  format?: (value: string) => string
  inputClassName?: string
}

type SelectOption = {
  value: string
  label: string
}

type SelectFormItemProps<TFieldValues extends FieldValues> = BaseFormItemProps<TFieldValues> & {
  type: "select"
  options: readonly SelectOption[] | SelectOption[]
  triggerClassName?: string
}

type ComboboxFormItemProps<TFieldValues extends FieldValues> = BaseFormItemProps<TFieldValues> & {
  type: "combobox"
  options: FormComboboxOption[]
  triggerClassName?: string
  searchPlaceholder?: string
  emptyMessage?: string
  renderOption?: (option: FormComboboxOption, selected: boolean) => React.ReactNode
  renderValue?: (option: FormComboboxOption | undefined) => React.ReactNode
}

type TextareaFormItemProps<TFieldValues extends FieldValues> = BaseFormItemProps<TFieldValues> & {
  type: "textarea"
  readOnly?: boolean
  rows?: number
  textareaClassName?: string
}

type IntFormItemProps<TFieldValues extends FieldValues> = BaseFormItemProps<TFieldValues> & {
  type: "int"
  readOnly?: boolean
  inputClassName?: string
}

type FormItemProps<TFieldValues extends FieldValues> =
  | InputFormItemProps<TFieldValues>
  | SelectFormItemProps<TFieldValues>
  | ComboboxFormItemProps<TFieldValues>
  | TextareaFormItemProps<TFieldValues>
  | IntFormItemProps<TFieldValues>

export function FormItem<TFieldValues extends FieldValues>(props: FormItemProps<TFieldValues>) {
  const {
    control,
    name,
    label,
    placeholder,
    description,
    disabled,
    autoComplete,
    className,
    labelAdornment,
    apiError,
  } = props

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const hasError = Boolean(fieldState.error) || Boolean(apiError)
        const inputId = String(name)
        const errorMessage = fieldState.error?.message || apiError

        return (
          <Field data-invalid={hasError} className={className}>
            <FieldLabel htmlFor={inputId} className="items-center gap-1.5">
              <span>{label}</span>
              {labelAdornment}
            </FieldLabel>

            {(props.type === undefined || props.type === "input") && (
              <Input
                {...field}
                id={inputId}
                type={props.inputType ?? "text"}
                step={props.step}
                value={
                  typeof field.value === "string" || typeof field.value === "number"
                    ? field.value
                    : (field.value ?? "")
                }
                placeholder={placeholder}
                autoComplete={autoComplete}
                readOnly={props.readOnly}
                disabled={disabled}
                aria-invalid={hasError}
                className={props.inputClassName}
                onChange={(event) => {
                  if (props.inputType === "number") {
                    const nextValue = event.target.value

                    if (nextValue === "") {
                      field.onChange("")
                      return
                    }

                    const parsed = Number(nextValue)
                    field.onChange(Number.isNaN(parsed) ? "" : parsed)
                    return
                  }

                  field.onChange(event.target.value)
                }}
                onBlur={(event) => {
                  if (props.format && props.inputType !== "number") {
                    field.onChange(props.format(event.target.value))
                  }

                  field.onBlur()
                }}
              />
            )}

            {props.type === "select" && (
              <Select
                value={typeof field.value === "string" ? field.value : ""}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id={inputId}
                  aria-invalid={hasError}
                  className={props.triggerClassName}
                >
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {props.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {props.type === "combobox" && (
              <ComboboxControl
                id={inputId}
                value={typeof field.value === "string" ? field.value : ""}
                options={props.options}
                onChange={field.onChange}
                placeholder={placeholder}
                searchPlaceholder={props.searchPlaceholder}
                emptyMessage={props.emptyMessage}
                disabled={disabled}
                ariaInvalid={hasError}
                triggerClassName={props.triggerClassName}
                renderOption={props.renderOption}
                renderValue={props.renderValue}
              />
            )}

            {props.type === "textarea" && (
              <Textarea
                {...field}
                id={inputId}
                value={typeof field.value === "string" ? field.value : (field.value ?? "")}
                placeholder={placeholder}
                readOnly={props.readOnly}
                disabled={disabled}
                rows={props.rows}
                aria-invalid={hasError}
                className={props.textareaClassName}
              />
            )}

            {props.type === "int" && (
              <Input
                {...field}
                id={inputId}
                type="number"
                step="1"
                inputMode="numeric"
                value={
                  typeof field.value === "string" || typeof field.value === "number"
                    ? field.value
                    : (field.value ?? "")
                }
                placeholder={placeholder}
                readOnly={props.readOnly}
                disabled={disabled}
                aria-invalid={hasError}
                className={props.inputClassName}
                onChange={(event) => {
                  const nextValue = event.target.value

                  if (nextValue === "") {
                    field.onChange("")
                    return
                  }

                  const parsed = Number(nextValue)
                  field.onChange(Number.isNaN(parsed) ? "" : parsed)
                }}
                onBlur={(event) => {
                  const nextValue = event.target.value

                  if (nextValue !== "") {
                    const parsed = Number(nextValue)

                    if (!Number.isNaN(parsed)) {
                      field.onChange(Math.round(parsed))
                    }
                  }

                  field.onBlur()
                }}
              />
            )}

            {description && !errorMessage ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError errors={errorMessage ? [{ message: errorMessage }] : undefined} />
          </Field>
        )
      }}
    />
  )
}
