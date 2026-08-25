"use client"

import type * as React from "react"
import type { Control, FieldValues, Path } from "react-hook-form"
import { Controller } from "react-hook-form"
import { CategorySelectControl } from "@/components/forms/form-category-select"
import {
  ColorPickerControl,
  type ColorPickerPreset,
  ColorSwatchesControl,
} from "@/components/forms/form-color-picker"
import type { FormComboboxOption } from "@/components/forms/form-combobox"
import { ComboboxControl } from "@/components/forms/form-combobox"
import { IconPickerControl } from "@/components/forms/form-icon-picker"
import { TagSelectControl } from "@/components/forms/form-tag-select"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { CategoryType } from "@/interfaces/category"
import type { CuratedIconOption } from "@/lib/icons"

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

type InputFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type?: "input"
    inputType?: "text" | "email" | "password" | "number" | "date"
    step?: string
    readOnly?: boolean
    format?: (value: string) => string
    inputClassName?: string
  }

type SelectOption = {
  value: string
  label: string
}

type SelectFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "select"
    options: readonly SelectOption[] | SelectOption[]
    triggerClassName?: string
    parseValue?: (value: string) => unknown
  }

type ComboboxFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "combobox"
    options: FormComboboxOption[]
    triggerClassName?: string
    searchPlaceholder?: string
    emptyMessage?: string
    renderOption?: (
      option: FormComboboxOption,
      selected: boolean,
    ) => React.ReactNode
    renderValue?: (option: FormComboboxOption | undefined) => React.ReactNode
  }

type TextareaFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "textarea"
    readOnly?: boolean
    rows?: number
    textareaClassName?: string
  }

type ColorFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "color"
    presets?: readonly ColorPickerPreset[]
    triggerClassName?: string
  }

type ColorSwatchesFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "colorSwatches"
    /** Flat list of hex colors shown as a row of selectable swatches. */
    presets: readonly string[]
  }

type IconFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "icon"
    /** Curated icon options shown in a searchable grid. */
    icons: readonly CuratedIconOption[]
    /** Tints the selected icon's glyph (e.g. the form's chosen color). */
    tintColor?: string
  }

type IntFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "int"
    readOnly?: boolean
    inputClassName?: string
  }

type CategoryFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "category"
    /** Restrict the options to a single category type. */
    categoryType?: CategoryType
    /** Exclude a category id (e.g. to prevent self-selection as a parent). */
    excludeId?: string
    /** Adds a "None" option so the field can be reset to empty. */
    allowClear?: boolean
    clearLabel?: string
    triggerClassName?: string
  }

type TagFormItemProps<TFieldValues extends FieldValues> =
  BaseFormItemProps<TFieldValues> & {
    type: "tag"
    triggerClassName?: string
  }

type FormItemProps<TFieldValues extends FieldValues> =
  | InputFormItemProps<TFieldValues>
  | SelectFormItemProps<TFieldValues>
  | ComboboxFormItemProps<TFieldValues>
  | ColorFormItemProps<TFieldValues>
  | ColorSwatchesFormItemProps<TFieldValues>
  | IconFormItemProps<TFieldValues>
  | TextareaFormItemProps<TFieldValues>
  | IntFormItemProps<TFieldValues>
  | CategoryFormItemProps<TFieldValues>
  | TagFormItemProps<TFieldValues>

export function FormItem<TFieldValues extends FieldValues>(
  props: FormItemProps<TFieldValues>,
) {
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
                  typeof field.value === "string" ||
                  typeof field.value === "number"
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
                value={
                  typeof field.value === "string" ||
                  typeof field.value === "number"
                    ? String(field.value)
                    : ""
                }
                onValueChange={(value) =>
                  field.onChange(props.parseValue?.(value) ?? value)
                }
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

            {props.type === "color" && (
              <ColorPickerControl
                id={inputId}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                placeholder={placeholder}
                presets={props.presets}
                disabled={disabled}
                ariaInvalid={hasError}
                className={props.triggerClassName}
              />
            )}

            {props.type === "colorSwatches" && (
              <ColorSwatchesControl
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                presets={props.presets}
                disabled={disabled}
              />
            )}

            {props.type === "icon" && (
              <IconPickerControl
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                icons={props.icons}
                tintColor={props.tintColor}
                disabled={disabled}
              />
            )}

            {props.type === "category" && (
              <CategorySelectControl
                id={inputId}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                placeholder={placeholder}
                type={props.categoryType}
                excludeId={props.excludeId}
                allowClear={props.allowClear}
                clearLabel={props.clearLabel}
                disabled={disabled}
                ariaInvalid={hasError}
                triggerClassName={props.triggerClassName}
              />
            )}

            {props.type === "tag" && (
              <TagSelectControl
                id={inputId}
                value={Array.isArray(field.value) ? field.value : []}
                onChange={field.onChange}
                placeholder={placeholder}
                disabled={disabled}
                ariaInvalid={hasError}
                triggerClassName={props.triggerClassName}
              />
            )}

            {props.type === "textarea" && (
              <Textarea
                {...field}
                id={inputId}
                value={
                  typeof field.value === "string"
                    ? field.value
                    : (field.value ?? "")
                }
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
                  typeof field.value === "string" ||
                  typeof field.value === "number"
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

            {description && !errorMessage ? (
              <FieldDescription>{description}</FieldDescription>
            ) : null}
            <FieldError
              errors={errorMessage ? [{ message: errorMessage }] : undefined}
            />
          </Field>
        )
      }}
    />
  )
}
