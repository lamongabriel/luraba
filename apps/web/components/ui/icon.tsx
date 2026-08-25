"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { DEFAULT_CURATED_ICON_NAME, resolveCuratedIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

const iconVariants = cva("inline-flex shrink-0 items-center justify-center", {
  variants: {
    variant: {
      /** Bare glyph, no background. */
      plain: "",
      /** Small tinted chip (translucent color background + tinted glyph). */
      chip: "rounded-lg",
    },
    size: {
      xs: "[&>svg]:size-3",
      sm: "[&>svg]:size-3.5",
      md: "[&>svg]:size-4",
      lg: "[&>svg]:size-5",
      xl: "[&>svg]:size-6",
    },
  },
  compoundVariants: [
    { variant: "chip", size: "xs", className: "size-4 rounded-md" },
    { variant: "chip", size: "sm", className: "size-5 rounded-md" },
    { variant: "chip", size: "md", className: "size-7 rounded-lg" },
    { variant: "chip", size: "lg", className: "size-9 rounded-lg" },
    { variant: "chip", size: "xl", className: "size-11 rounded-xl" },
  ],
  defaultVariants: {
    variant: "plain",
    size: "md",
  },
})

const NEUTRAL_COLOR = "var(--color-muted-foreground)"

export interface IconProps
  extends Omit<
      React.ComponentProps<typeof HugeiconsIcon>,
      "icon" | "size" | "color" | "name"
    >,
    VariantProps<typeof iconVariants> {
  /** Persisted icon name (a hugeicons export name, e.g. "Wallet01Icon"). */
  name?: string | null
  /**
   * Tint color. Applied to the glyph; on `variant="chip"` it also tints a
   * translucent chip background. Falls back to a neutral muted tone.
   */
  color?: string | null
  className?: string
}

/**
 * Generic, name-based icon renderer shared across the whole app. Resolves a
 * persisted icon name against the curated hugeicons palette (`lib/icons.ts`)
 * and renders it with consistent sizing/variant styling — no more bespoke
 * per-feature icon components (e.g. category/tag icons).
 *
 * Usage:
 *   <Icon name={category.icon} color={category.color} variant="chip" size="sm" />
 *   <Icon name="Wallet01Icon" size="lg" />
 */
export function Icon({
  name,
  color,
  variant,
  size,
  className,
  strokeWidth = 2,
  ...props
}: IconProps) {
  const icon =
    resolveCuratedIcon(name) ?? resolveCuratedIcon(DEFAULT_CURATED_ICON_NAME)
  const tint = color ?? NEUTRAL_COLOR
  const isChip = variant === "chip"

  return (
    <span
      data-slot="icon"
      className={cn(iconVariants({ variant, size }), className)}
      style={{
        color: tint,
        backgroundColor: isChip
          ? color
            ? `color-mix(in oklch, ${color} 14%, transparent)`
            : "var(--color-muted)"
          : undefined,
      }}
    >
      {icon ? (
        <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} {...props} />
      ) : null}
    </span>
  )
}
