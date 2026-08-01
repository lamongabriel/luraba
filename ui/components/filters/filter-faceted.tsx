"use client"

import {
  CancelCircleIcon,
  CheckIcon,
  CirclePlusIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Column } from "@tanstack/react-table"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Option } from "@/types/data-table"

type FilterFacetedProps<TData, TValue> =
  | {
      column: Column<TData, TValue>
      title?: string
      options: Option[]
      multiple?: boolean
    }
  | {
      value?: string | string[]
      onValueChange?: (value: string | string[] | undefined) => void
      title?: string
      options: Option[]
      multiple?: boolean
    }

function isTableFilterProps<TData, TValue>(
  props: FilterFacetedProps<TData, TValue>,
): props is Extract<
  FilterFacetedProps<TData, TValue>,
  { column: Column<TData, TValue> }
> {
  return "column" in props
}

function normalizeSelectedValues(value: unknown) {
  if (Array.isArray(value)) return new Set(value)
  if (typeof value === "string" && value.length > 0) return new Set([value])
  return new Set<string>()
}

export function FilterFaceted<TData, TValue>(
  props: FilterFacetedProps<TData, TValue>,
) {
  const { title, options, multiple = false } = props
  const [open, setOpen] = React.useState(false)

  const selectedValues = React.useMemo(() => {
    return normalizeSelectedValues(
      isTableFilterProps(props) ? props.column.getFilterValue() : props.value,
    )
  }, [props])

  const onValueChange = React.useCallback(
    (value: string | string[] | undefined) => {
      if (isTableFilterProps(props)) {
        props.column.setFilterValue(value)
        return
      }

      props.onValueChange?.(value)
    },
    [props],
  )

  const onItemSelect = React.useCallback(
    (option: Option, isSelected: boolean) => {
      if (multiple) {
        const nextValues = new Set(selectedValues)

        if (isSelected) {
          nextValues.delete(option.value)
        } else {
          nextValues.add(option.value)
        }

        const values = Array.from(nextValues)
        onValueChange(values.length > 0 ? values : undefined)
        return
      }

      if (isTableFilterProps(props)) {
        onValueChange(isSelected ? undefined : [option.value])
      } else {
        onValueChange(isSelected ? undefined : option.value)
      }

      setOpen(false)
    },
    [multiple, onValueChange, props, selectedValues],
  )

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation()
      onValueChange(undefined)
    },
    [onValueChange],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative inline-flex">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "border-dashed font-normal",
              selectedValues.size > 0 && "pr-8",
            )}
          >
            <HugeiconsIcon icon={CirclePlusIcon} strokeWidth={2} />
            {title}
            {selectedValues.size > 0 && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-0.5 data-[orientation=vertical]:h-4"
                />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal lg:hidden"
                >
                  {selectedValues.size}
                </Badge>
                <div className="hidden items-center gap-1 lg:flex">
                  {selectedValues.size > 2 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {selectedValues.size} selected
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selectedValues.has(option.value))
                      .map((option) => (
                        <Badge
                          variant="secondary"
                          key={option.value}
                          className="rounded-sm px-1 font-normal"
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
          </Button>
        </PopoverTrigger>
        {selectedValues.size > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Clear ${title ?? "faceted"} filter`}
            className="absolute top-1/2 right-1 z-10 -translate-y-1/2 rounded-sm opacity-70 shadow-none hover:opacity-100"
            onClick={onReset}
          >
            <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} />
          </Button>
        ) : null}
      </div>
      <PopoverContent className="w-50 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)

                return (
                  <CommandItem
                    key={option.value}
                    className="[&>svg:last-child]:hidden"
                    onSelect={() => onItemSelect(option, isSelected)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <HugeiconsIcon icon={CheckIcon} strokeWidth={2} />
                    </div>
                    {option.icon ? <option.icon /> : null}
                    <span className="truncate">{option.label}</span>
                    {option.count ? (
                      <span className="ml-auto font-mono text-xs">
                        {option.count}
                      </span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className="justify-center text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
