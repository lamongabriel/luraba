"use client";

import { ArrowDown01Icon, Calendar03Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentMonthKey, formatMonthKeyLabel, shiftMonthKey } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

/** Months offered below the presets: a few ahead, a year and a half back. */
const MONTHS_AHEAD = 3;
const MONTHS_BACK = 18;

/** The named presets, as offsets from the current month. */
export const MONTH_PRESETS = [
  { label: "This month", offset: 0 },
  { label: "Last month", offset: -1 },
  { label: "Next month", offset: 1 },
] as const;

/** The month keys of the pick list, newest first. Pure so it can be tested. */
export function monthPickList(current: string): string[] {
  return Array.from({ length: MONTHS_AHEAD + MONTHS_BACK + 1 }, (_, index) =>
    shiftMonthKey(current, MONTHS_AHEAD - index),
  );
}

/**
 * A month as one button ("November 2026" + chevron). Desktop opens a dropdown, mobile a bottom drawer (the
 * shared `DropdownMenu` wrapper decides): presets first (this, last and next month), then every month from a
 * few ahead to a year and a half back. Values are `YYYY-MM` keys. Pair it with `useMonthFilter` for a
 * URL-backed month; month pages use this instead of a second period control.
 */
export function MonthPresetButton({
  value,
  onChange,
  timezone = "UTC",
  language = "en",
  className,
}: {
  value: string;
  onChange: (monthKey: string) => void;
  timezone?: string;
  language?: string;
  className?: string;
}) {
  const current = currentMonthKey(timezone);
  const months = monthPickList(current);
  if (!months.includes(value)) months.push(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Month: ${formatMonthKeyLabel(value, language)}`}
          className={cn("h-9 gap-2 px-3 text-sm md:h-8", className)}
        >
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} data-icon="inline-start" />
          {formatMonthKeyLabel(value, language)}
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuLabel>Quick pick</DropdownMenuLabel>
        {MONTH_PRESETS.map((preset) => {
          const key = shiftMonthKey(current, preset.offset);
          return (
            <DropdownMenuItem key={preset.label} onSelect={() => onChange(key)}>
              <span className="flex-1">{preset.label}</span>
              <span className="text-xs text-muted-foreground">
                {formatMonthKeyLabel(key, language, "short")}
              </span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>All months</DropdownMenuLabel>
        {months.map((key) => (
          <DropdownMenuItem key={key} onSelect={() => onChange(key)}>
            <span className="flex-1">{formatMonthKeyLabel(key, language)}</span>
            {key === value ? (
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
