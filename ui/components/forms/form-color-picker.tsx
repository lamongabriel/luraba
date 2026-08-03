"use client"

import { ColorPickerIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Color from "color"
import type * as React from "react"
import type { Control, FieldValues, Path } from "react-hook-form"
import { Controller } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  ColorPickerEyeDropper,
  ColorPickerHue,
  ColorPicker as ColorPickerPrimitive,
  ColorPickerSelection,
} from "@/components/ui/color-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ColorPickerPreset = {
  label: string
  value: string
}

const DEFAULT_COLOR_PRESETS = [
  { label: "Neutral", value: "#d4d4d8" },
  { label: "Black", value: "#18181b" },
  { label: "Slate", value: "#475569" },
  { label: "Blue", value: "#164e63" },
  { label: "Green", value: "#25543d" },
  { label: "Clay", value: "#8c3f2e" },
] as const satisfies readonly ColorPickerPreset[]

function toHex(value: Parameters<typeof Color.rgb>[0]) {
  return Color.rgb(value).hex().toLowerCase()
}

export function ColorPickerControl({
  ariaInvalid,
  className,
  disabled,
  id,
  onChange,
  placeholder = "Choose color",
  presets = DEFAULT_COLOR_PRESETS,
  value,
}: {
  ariaInvalid?: boolean
  className?: string
  disabled?: boolean
  id: string
  onChange: (value: string) => void
  placeholder?: string
  presets?: readonly ColorPickerPreset[]
  value: string
}) {
  const selected = value || presets[0]?.value || DEFAULT_COLOR_PRESETS[0].value

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-10 w-full justify-start rounded-xl border-border/90 bg-[var(--color-container-inset)] px-3 font-normal shadow-none hover:bg-muted/70",
            className,
          )}
        >
          <span
            className="size-5 rounded-full border border-white/20"
            style={{ backgroundColor: selected }}
          />
          <span className="text-xs">{placeholder}</span>
          <HugeiconsIcon
            icon={ColorPickerIcon}
            className="ml-auto size-4 text-muted-foreground"
            strokeWidth={2}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-4 p-4">
        <div className="grid grid-cols-6 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              aria-label={`Use ${preset.label}`}
              aria-pressed={selected.toLowerCase() === preset.value}
              className={cn(
                "size-8 rounded-full border border-white/15 outline-none ring-offset-2 ring-offset-popover focus-visible:ring-2 focus-visible:ring-ring",
                selected.toLowerCase() === preset.value &&
                  "ring-2 ring-foreground/70",
              )}
              style={{ backgroundColor: preset.value }}
              onClick={() => onChange(preset.value)}
            />
          ))}
        </div>
        <ColorPickerPrimitive
          value={selected}
          onChange={(nextColor) => onChange(toHex(nextColor))}
          className="gap-3"
        >
          <ColorPickerSelection className="h-32" />
          <div className="flex items-center gap-3">
            <ColorPickerEyeDropper />
            <ColorPickerHue />
          </div>
        </ColorPickerPrimitive>
      </PopoverContent>
    </Popover>
  )
}

/**
 * A simple row of selectable hex color swatches (no popover, no color
 * wheel). This is the raw control rendered by `FormItem` (`type="colorSwatches"`);
 * it is not intended to be used standalone outside of a form field context.
 */
export function ColorSwatchesControl({
  value,
  onChange,
  presets,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  presets: readonly string[]
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase()

        return (
          <button
            key={color}
            type="button"
            disabled={disabled}
            aria-label={`Select color ${color}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={cn(
              "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              selected
                ? "ring-2 ring-foreground/70"
                : "hover:scale-110 ring-1 ring-foreground/10",
            )}
            style={{ backgroundColor: color }}
          />
        )
      })}
    </div>
  )
}

export function FormColorPicker<TFieldValues extends FieldValues>({
  className,
  control,
  disabled,
  label,
  name,
  placeholder,
  presets,
}: {
  className?: string
  control: Control<TFieldValues>
  disabled?: boolean
  label: React.ReactNode
  name: Path<TFieldValues>
  placeholder?: string
  presets?: readonly ColorPickerPreset[]
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={Boolean(fieldState.error)} className={className}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <ColorPickerControl
            id={String(name)}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={field.onChange}
            disabled={disabled}
            ariaInvalid={Boolean(fieldState.error)}
            placeholder={placeholder}
            presets={presets}
          />
          <FieldError
            errors={fieldState.error ? [fieldState.error] : undefined}
          />
        </Field>
      )}
    />
  )
}
