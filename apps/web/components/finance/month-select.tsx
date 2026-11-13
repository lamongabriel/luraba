"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { HEADER_CONTROL_CLASS } from "@/components/finance/header-actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { currentMonthKey, formatMonthKeyLabel, shiftMonthKey } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

/** The named presets, as offsets from the current month. */
export const MONTH_PRESETS = [
  { label: "This month", offset: 0 },
  { label: "Last month", offset: -1 },
  { label: "Next month", offset: 1 },
] as const;

/** Whether `key` (`YYYY-MM`) is outside the allowed range. Pure so it can be tested. */
export function isMonthOutOfRange(key: string, minMonth?: string, maxMonth?: string): boolean {
  return Boolean((minMonth && key < minMonth) || (maxMonth && key > maxMonth));
}

/**
 * THE month control of the app (one component, every month-based page): a pill with a calendar icon and the month
 * ("November 2026"). It opens the month presets (this, last and next month) and a month grid with year arrows; the
 * shared `Popover` makes that a popover on desktop and a bottom drawer on a phone. Below `md` the trigger is a
 * circle with the calendar icon only, like every other header control (`iconOnlyOnMobile={false}` keeps the text
 * where the control is not in a page header). Values are `YYYY-MM` keys; pair it with `useMonthFilter` for a
 * URL-backed month. Modelled on Nexus's `DateRangePicker` (presets beside the calendar, one control height).
 */
export function MonthSelect({
  value,
  onChange,
  timezone = "UTC",
  language = "en",
  minMonth,
  maxMonth,
  disabled,
  iconOnlyOnMobile = true,
  align = "end",
  className,
}: {
  value: string;
  onChange: (monthKey: string) => void;
  timezone?: string;
  language?: string;
  minMonth?: string;
  maxMonth?: string;
  disabled?: boolean;
  iconOnlyOnMobile?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(Number(value.slice(0, 4)));
  React.useEffect(() => {
    if (open) setYear(Number(value.slice(0, 4)));
  }, [open, value]);

  const current = currentMonthKey(timezone);
  const label = formatMonthKeyLabel(value, language);
  const choose = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={`Month: ${label}. Change month`}
          data-header-control="month"
          className={cn(
            "bg-card font-normal md:px-3 dark:bg-input/30",
            iconOnlyOnMobile ? HEADER_CONTROL_CLASS : "h-8 px-3",
            className,
          )}
        >
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} />
          <span className={cn(iconOnlyOnMobile && "max-md:sr-only")}>{label}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn("text-muted-foreground", iconOnlyOnMobile && "max-md:hidden")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} aria-label="Choose a month" className="w-72 gap-3 p-3">
        <div className="flex gap-2">
          {MONTH_PRESETS.map((preset) => {
            const key = shiftMonthKey(current, preset.offset);
            return (
              <Button
                key={preset.label}
                type="button"
                variant={value === key ? "secondary" : "outline"}
                size="sm"
                className="flex-1 px-1"
                disabled={isMonthOutOfRange(key, minMonth, maxMonth)}
                onClick={() => choose(key)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous year"
            disabled={isMonthOutOfRange(`${year - 1}-12`, minMonth, maxMonth)}
            onClick={() => setYear((previous) => previous - 1)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <span className="text-sm font-medium tabular-nums">{year}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next year"
            disabled={isMonthOutOfRange(`${year + 1}-01`, minMonth, maxMonth)}
            onClick={() => setYear((previous) => previous + 1)}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_NUMBERS.map((number) => {
            const key = `${year}-${number}`;
            return (
              <Button
                key={key}
                type="button"
                variant={key === value ? "default" : "ghost"}
                size="sm"
                disabled={isMonthOutOfRange(key, minMonth, maxMonth)}
                aria-pressed={key === value}
                onClick={() => choose(key)}
              >
                {formatMonthKeyLabel(key, language, "short").replace(/ \d+$/, "")}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
