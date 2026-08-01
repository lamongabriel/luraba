"use client"

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import type { Control, FieldValues, Path } from "react-hook-form"
import { Controller } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const itemRefs = React.useRef<Array<HTMLDivElement | null>>([])

  const filteredOptions = options.filter((option) => {
    const searchValue = query.trim().toLowerCase()

    if (!searchValue) {
      return true
    }

    const haystack = [
      option.label,
      option.description ?? "",
      option.searchText ?? "",
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(searchValue)
  })

  React.useEffect(() => {
    if (!open) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const selectedOption = options.find((option) => option.value === value)
  const triggerLabel = renderValue
    ? renderValue(selectedOption)
    : selectedOption
      ? selectedOption.label
      : placeholder
  const selectedIndex = filteredOptions.findIndex(
    (option) => option.value === value,
  )

  const selectOption = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
    setQuery("")
    triggerRef.current?.focus()
  }

  const focusItemAtIndex = (index: number) => {
    const clampedIndex = Math.max(
      0,
      Math.min(index, filteredOptions.length - 1),
    )
    setActiveIndex(clampedIndex)
    const element = itemRefs.current[clampedIndex]
    element?.focus()
    element?.scrollIntoView({ block: "nearest" })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)

        if (!nextOpen) {
          setQuery("")
          setActiveIndex(-1)
          triggerRef.current?.focus()
        } else {
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          aria-invalid={ariaInvalid}
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-xl border-transparent bg-background/40 px-3 text-left text-xs shadow-none hover:bg-background/50",
            !selectedOption && "text-muted-foreground",
            triggerClassName,
          )}
          onKeyDown={(event) => {
            if (
              event.key === "ArrowDown" ||
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault()
              setOpen(true)
            }
          }}
        >
          <span className="min-w-0 truncate">{triggerLabel}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-60 overflow-hidden p-0">
        <Command className="rounded-[1.2rem] border-0 bg-transparent text-xs shadow-none">
          <CommandInput
            ref={inputRef}
            autoFocus
            value={query}
            placeholder={searchPlaceholder}
            onValueChange={setQuery}
            className="h-6 text-[0.72rem]"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                focusItemAtIndex(activeIndex >= 0 ? activeIndex + 1 : 0)
              }

              if (event.key === "ArrowUp") {
                event.preventDefault()
                focusItemAtIndex(
                  activeIndex >= 0
                    ? activeIndex - 1
                    : filteredOptions.length - 1,
                )
              }

              if (event.key === "Enter" && filteredOptions.length > 0) {
                event.preventDefault()
                const indexToSelect =
                  activeIndex >= 0
                    ? activeIndex
                    : selectedIndex >= 0
                      ? selectedIndex
                      : 0
                selectOption(filteredOptions[indexToSelect].value)
              }

              if (event.key === "Escape") {
                event.preventDefault()
                setOpen(false)
                setQuery("")
                triggerRef.current?.focus()
              }
            }}
          />
          <div
            role="listbox"
            className="max-h-48 overflow-y-auto overscroll-contain p-1.5 pr-1"
            onWheelCapture={(event) => {
              event.stopPropagation()
            }}
          >
            {filteredOptions.length === 0 ? (
              <CommandEmpty className="px-2 py-6 text-xs">
                {emptyMessage}
              </CommandEmpty>
            ) : null}

            {filteredOptions.map((option, index) => {
              const selected = option.value === value

              return (
                <CommandItem
                  key={option.value}
                  ref={(element) => {
                    itemRefs.current[index] = element
                  }}
                  className="rounded-lg px-2.5 py-2 text-xs"
                  onFocus={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onSelect={() => {
                    selectOption(option.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault()
                      focusItemAtIndex(index + 1)
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault()
                      if (index === 0) {
                        inputRef.current?.focus()
                        setActiveIndex(-1)
                        return
                      }

                      focusItemAtIndex(index - 1)
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      selectOption(option.value)
                    }

                    if (event.key === "Escape") {
                      event.preventDefault()
                      setOpen(false)
                      setQuery("")
                      triggerRef.current?.focus()
                    }
                  }}
                >
                  {renderOption ? (
                    renderOption(option, selected)
                  ) : (
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="truncate">{option.label}</span>
                      {option.description ? (
                        <span className="truncate text-[0.7rem] text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  )}

                  {selected ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      strokeWidth={2}
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                  ) : null}
                </CommandItem>
              )
            })}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
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
