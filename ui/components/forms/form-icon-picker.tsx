"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import { Input } from "@/components/ui/input"
import type { CuratedIconOption } from "@/lib/icons"
import { cn } from "@/lib/utils"

/**
 * A searchable grid of curated icons. This is the raw control rendered by
 * `FormItem` (`type="icon"`); it is not intended to be used standalone
 * outside of a form field context.
 */
export function IconPickerControl({
  value,
  onChange,
  icons,
  tintColor,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  icons: readonly CuratedIconOption[]
  /** Tints the selected icon's glyph (e.g. the form's chosen color). */
  tintColor?: string
  disabled?: boolean
}) {
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase()

    if (!term) {
      return icons
    }

    return icons.filter((option) =>
      `${option.name} ${option.keywords ?? ""}`.toLowerCase().includes(term),
    )
  }, [icons, query])

  return (
    <div className="space-y-2">
      <Input
        value={query}
        placeholder="Search icons..."
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="grid max-h-44 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-border/60 bg-input/10 p-2">
        {filtered.length === 0 ? (
          <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">
            No icons found.
          </p>
        ) : (
          filtered.map((option) => {
            const selected = value === option.name

            return (
              <button
                key={option.name}
                type="button"
                disabled={disabled}
                aria-label={`Select icon ${option.name}`}
                aria-pressed={selected}
                onClick={() => onChange(option.name)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                  selected
                    ? "bg-muted ring-1 ring-foreground/40"
                    : "hover:bg-muted/60",
                )}
                style={selected ? { color: tintColor } : undefined}
              >
                <HugeiconsIcon
                  icon={option.icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
