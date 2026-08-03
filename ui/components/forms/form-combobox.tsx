"use client"

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as React from "react"
import type { Control, FieldValues, Path } from "react-hook-form"
import { Controller } from "react-hook-form"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

export interface FormComboboxOption {
  description?: string
  label: string
  searchText?: string
  value: string
}

type FormComboboxProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  name: Path<TFieldValues>
  label: React.ReactNode
  options: FormComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  renderOption?: (
    option: FormComboboxOption,
    selected: boolean,
  ) => React.ReactNode
  renderValue?: (option: FormComboboxOption | undefined) => React.ReactNode
}

type ComboboxControlProps = {
  id: string
  value: string
  options: FormComboboxOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  ariaInvalid?: boolean
  triggerClassName?: string
  renderOption?: (
    option: FormComboboxOption,
    selected: boolean,
  ) => React.ReactNode
  renderValue?: (option: FormComboboxOption | undefined) => React.ReactNode
}

export function ComboboxControl({
  id,
  value,
  options,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled,
  triggerClassName,
  ariaInvalid,
  renderOption,
  renderValue,
}: ComboboxControlProps) {
  const selectedOption = options.find((option) => option.value === value)
  const selectedLabel = renderValue
    ? renderValue(selectedOption)
    : selectedOption?.label

  return (
    <Combobox
      data={options.map((option) => ({
        label: option.label,
        value: option.value,
      }))}
      type="option"
      value={value}
      onValueChange={onChange}
    >
      <ComboboxTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "h-10 w-full justify-between rounded-xl border-border/90 bg-[var(--color-container-inset)] px-3 text-left text-xs font-normal shadow-none hover:bg-muted/70",
          !selectedOption && "text-muted-foreground",
          triggerClassName,
        )}
      >
        <span className="min-w-0 truncate">{selectedLabel ?? placeholder}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      </ComboboxTrigger>
      <ComboboxContent
        className="max-h-[min(20rem,var(--radix-popover-content-available-height))] rounded-xl border border-border/70 p-0 shadow-none"
        popoverOptions={{ align: "start" }}
      >
        <ComboboxInput
          placeholder={searchPlaceholder}
          className="h-9 text-xs"
        />
        <ComboboxList className="max-h-64 p-1.5 [scrollbar-width:thin]">
          <ComboboxEmpty className="px-2 py-6 text-xs">
            {emptyMessage}
          </ComboboxEmpty>
          <ComboboxGroup>
            {options.map((option) => {
              const selected = option.value === value

              return (
                <ComboboxItem
                  key={option.value}
                  value={option.value}
                  keywords={[
                    option.label,
                    option.description ?? "",
                    option.searchText ?? "",
                  ]}
                  className="rounded-lg px-2.5 py-2 text-xs"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    {renderOption ? (
                      renderOption(option, selected)
                    ) : (
                      <>
                        <span className="truncate">{option.label}</span>
                        {option.description ? (
                          <span className="truncate text-[0.7rem] text-muted-foreground">
                            {option.description}
                          </span>
                        ) : null}
                      </>
                    )}
                  </span>
                  {selected ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  ) : null}
                </ComboboxItem>
              )
            })}
          </ComboboxGroup>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function FormCombobox<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled,
  className,
  triggerClassName,
  renderOption,
  renderValue,
}: FormComboboxProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const hasError = Boolean(fieldState.error)

        return (
          <Field data-invalid={hasError} className={className}>
            <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
            <ComboboxControl
              id={String(name)}
              value={typeof field.value === "string" ? field.value : ""}
              options={options}
              onChange={field.onChange}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              emptyMessage={emptyMessage}
              disabled={disabled}
              ariaInvalid={hasError}
              triggerClassName={triggerClassName}
              renderOption={renderOption}
              renderValue={renderValue}
            />
            <FieldError
              errors={fieldState.error ? [fieldState.error] : undefined}
            />
          </Field>
        )
      }}
    />
  )
}
