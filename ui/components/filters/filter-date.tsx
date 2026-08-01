"use client"

import { CalendarIcon, CancelCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Column } from "@tanstack/react-table"
import * as React from "react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type FilterDateProps<TData> =
  | {
      column: Column<TData, unknown>
      title?: string
      multiple?: boolean
    }
  | {
      value?: Date | DateRange
      onValueChange?: (value: Date | DateRange | undefined) => void
      title?: string
      multiple?: boolean
    }

function isTableFilterProps<TData>(
  props: FilterDateProps<TData>,
): props is Extract<
  FilterDateProps<TData>,
  { column: Column<TData, unknown> }
> {
  return "column" in props
}

function parseAsDate(timestamp: number | string | undefined): Date | undefined {
  if (!timestamp) return undefined

  const numericTimestamp =
    typeof timestamp === "string" ? Number(timestamp) : timestamp
  const date = new Date(numericTimestamp)

  return !Number.isNaN(date.getTime()) ? date : undefined
}

function parseColumnFilterValue(value: unknown) {
  if (value === null || value === undefined) return []

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "number" || typeof item === "string") {
        return item
      }

      return undefined
    })
  }

  if (typeof value === "string" || typeof value === "number") {
    return [value]
  }

  return []
}

function formatDateRange(range: DateRange) {
  if (!range.from && !range.to) return ""
  if (range.from && range.to) {
    return `${formatDate(range.from)} - ${formatDate(range.to)}`
  }

  return formatDate(range.from ?? range.to)
}

export function FilterDate<TData>(props: FilterDateProps<TData>) {
  const { title, multiple = false } = props

  const selectedValue = React.useMemo(() => {
    if (isTableFilterProps(props)) {
      const columnFilterValue = props.column.getFilterValue()

      if (!columnFilterValue) return undefined

      if (multiple) {
        const timestamps = parseColumnFilterValue(columnFilterValue)
        return {
          from: parseAsDate(timestamps[0]),
          to: parseAsDate(timestamps[1]),
        } satisfies DateRange
      }

      const timestamps = parseColumnFilterValue(columnFilterValue)
      return parseAsDate(timestamps[0])
    }

    return props.value
  }, [multiple, props])

  const onValueChange = React.useCallback(
    (value: Date | DateRange | undefined) => {
      if (isTableFilterProps(props)) {
        if (!value) {
          props.column.setFilterValue(undefined)
          return
        }

        if (multiple && !("getTime" in value)) {
          const from = value.from?.getTime()
          const to = value.to?.getTime()
          props.column.setFilterValue(from || to ? [from, to] : undefined)
          return
        }

        if (!multiple && "getTime" in value) {
          props.column.setFilterValue(value.getTime())
        }

        return
      }

      props.onValueChange?.(value)
    },
    [multiple, props],
  )

  const onReset = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      onValueChange(undefined)
    },
    [onValueChange],
  )

  const hasValue = React.useMemo(() => {
    if (multiple) {
      if (!selectedValue || "getTime" in selectedValue) return false
      return Boolean(selectedValue.from || selectedValue.to)
    }

    return selectedValue instanceof Date
  }, [multiple, selectedValue])

  const label = React.useMemo(() => {
    if (multiple) {
      const range =
        selectedValue && !("getTime" in selectedValue)
          ? selectedValue
          : undefined
      const dateText = range ? formatDateRange(range) : "Select date range"

      return (
        <span className="flex items-center gap-2">
          {title ? <span>{title}</span> : null}
          {range ? (
            <>
              {title ? (
                <Separator
                  orientation="vertical"
                  className="mx-0.5 data-[orientation=vertical]:h-4"
                />
              ) : null}
              <span>{dateText}</span>
            </>
          ) : !title ? (
            <span>{dateText}</span>
          ) : null}
        </span>
      )
    }

    const date = selectedValue instanceof Date ? selectedValue : undefined
    const dateText = date ? formatDate(date) : "Select date"

    return (
      <span className="flex items-center gap-2">
        {title ? <span>{title}</span> : null}
        {date ? (
          <>
            {title ? (
              <Separator
                orientation="vertical"
                className="mx-0.5 data-[orientation=vertical]:h-4"
              />
            ) : null}
            <span>{dateText}</span>
          </>
        ) : !title ? (
          <span>{dateText}</span>
        ) : null}
      </span>
    )
  }, [multiple, selectedValue, title])

  return (
    <Popover>
      <div className="relative inline-flex">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("border-dashed font-normal", hasValue && "pr-8")}
          >
            <HugeiconsIcon icon={CalendarIcon} strokeWidth={2} />
            {label}
          </Button>
        </PopoverTrigger>
        {hasValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Clear ${title ?? "date"} filter`}
            className="absolute top-1/2 right-1 z-10 -translate-y-1/2 rounded-sm opacity-70 shadow-none hover:opacity-100"
            onClick={onReset}
          >
            <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} />
          </Button>
        ) : null}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        {multiple ? (
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="range"
            selected={
              selectedValue && !("getTime" in selectedValue)
                ? selectedValue
                : undefined
            }
            onSelect={onValueChange}
          />
        ) : (
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="single"
            selected={selectedValue instanceof Date ? selectedValue : undefined}
            onSelect={onValueChange}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
