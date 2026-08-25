"use client"

import { CancelCircleIcon, CirclePlusIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Column } from "@tanstack/react-table"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

type RangeValue = [number, number]

type FilterSliderProps<TData> =
  | {
      column: Column<TData, unknown>
      title?: string
      range?: RangeValue
      unit?: string
    }
  | {
      value?: RangeValue
      onValueChange?: (value: RangeValue | undefined) => void
      title?: string
      range?: RangeValue
      unit?: string
    }

function isTableFilterProps<TData>(
  props: FilterSliderProps<TData>,
): props is Extract<
  FilterSliderProps<TData>,
  { column: Column<TData, unknown> }
> {
  return "column" in props
}

function getIsValidRange(value: unknown): value is RangeValue {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  )
}

function parseValuesAsNumbers(value: unknown): RangeValue | undefined {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (item) =>
        (typeof item === "string" || typeof item === "number") &&
        !Number.isNaN(item),
    )
  ) {
    return [Number(value[0]), Number(value[1])]
  }

  return undefined
}

export function FilterSlider<TData>(props: FilterSliderProps<TData>) {
  const { title } = props
  const id = React.useId()
  const [open, setOpen] = React.useState(false)

  const { value, range, unit, onValueChange } = React.useMemo(() => {
    if (isTableFilterProps(props)) {
      const columnFilterValue = parseValuesAsNumbers(
        props.column.getFilterValue(),
      )
      const defaultRange =
        props.range ??
        props.column.columnDef.meta?.range ??
        ([0, 100] as RangeValue)

      return {
        value: columnFilterValue,
        range: defaultRange,
        unit: props.unit ?? props.column.columnDef.meta?.unit,
        onValueChange: (nextValue: RangeValue | undefined) =>
          props.column.setFilterValue(nextValue),
      }
    }

    return {
      value: props.value,
      range:
        props.range ??
        (getIsValidRange(props.value) ? props.value : ([0, 100] as RangeValue)),
      unit: props.unit,
      onValueChange: props.onValueChange,
    }
  }, [props])

  const [min, max] = range

  const step = React.useMemo(() => {
    const rangeSize = max - min

    if (rangeSize <= 20) return 1
    if (rangeSize <= 100) return Math.ceil(rangeSize / 20)
    return Math.ceil(rangeSize / 50)
  }, [max, min])

  const resolvedValue = React.useMemo<RangeValue>(() => {
    return value ?? [min, max]
  }, [max, min, value])

  const formatValue = React.useCallback((item: number) => {
    return item.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }, [])

  const onFromInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)

      if (
        !Number.isNaN(nextValue) &&
        nextValue >= min &&
        nextValue <= resolvedValue[1]
      ) {
        onValueChange?.([nextValue, resolvedValue[1]])
      }
    },
    [min, onValueChange, resolvedValue],
  )

  const onToInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)

      if (
        !Number.isNaN(nextValue) &&
        nextValue <= max &&
        nextValue >= resolvedValue[0]
      ) {
        onValueChange?.([resolvedValue[0], nextValue])
      }
    },
    [max, onValueChange, resolvedValue],
  )

  const onSliderValueChange = React.useCallback(
    (nextValue: number[]) => {
      if (Array.isArray(nextValue) && nextValue.length === 2) {
        onValueChange?.([nextValue[0], nextValue[1]])
      }
    },
    [onValueChange],
  )

  const onReset = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      onValueChange?.(undefined)
    },
    [onValueChange],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative inline-flex">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("border-dashed font-normal", value && "pr-8")}
          >
            <HugeiconsIcon icon={CirclePlusIcon} strokeWidth={2} />
            <span>{title}</span>
            {value ? (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-0.5 data-[orientation=vertical]:h-4"
                />
                {formatValue(value[0])} - {formatValue(value[1])}
                {unit ? ` ${unit}` : ""}
              </>
            ) : null}
          </Button>
        </PopoverTrigger>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Clear ${title ?? "range"} filter`}
            className="absolute top-1/2 right-1 z-10 -translate-y-1/2 opacity-70 hover:opacity-100"
            onClick={onReset}
          >
            <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} />
          </Button>
        ) : null}
      </div>
      <PopoverContent align="start" className="flex w-auto flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {title}
          </p>
          <div className="flex items-center gap-4">
            <Label htmlFor={`${id}-from`} className="sr-only">
              From
            </Label>
            <div className="relative">
              <Input
                id={`${id}-from`}
                type="number"
                aria-valuemin={min}
                aria-valuemax={max}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={min.toString()}
                min={min}
                max={max}
                value={resolvedValue[0].toString()}
                onChange={onFromInputChange}
                className={cn("h-7 w-24", unit && "pr-8")}
              />
              {unit ? (
                <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                  {unit}
                </span>
              ) : null}
            </div>
            <Label htmlFor={`${id}-to`} className="sr-only">
              to
            </Label>
            <div className="relative">
              <Input
                id={`${id}-to`}
                type="number"
                aria-valuemin={min}
                aria-valuemax={max}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={max.toString()}
                min={min}
                max={max}
                value={resolvedValue[1].toString()}
                onChange={onToInputChange}
                className={cn("h-7 w-24", unit && "pr-8")}
              />
              {unit ? (
                <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                  {unit}
                </span>
              ) : null}
            </div>
          </div>
          <Label htmlFor={`${id}-slider`} className="sr-only">
            {title} slider
          </Label>
          <Slider
            id={`${id}-slider`}
            min={min}
            max={max}
            step={step}
            value={resolvedValue}
            onValueChange={onSliderValueChange}
          />
        </div>
        <Button
          aria-label={`Clear ${title ?? "range"} filter`}
          variant="outline"
          onClick={onReset}
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  )
}
