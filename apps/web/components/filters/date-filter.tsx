"use client";

import { ArrowDown01Icon, Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PREFERRED_PERIOD_OPTIONS } from "@luraba/contracts";
import type { PreferredPeriod } from "@luraba/domain";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import type { DateFilterState } from "@/components/filters/use-date-filter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";

/**
 * The required date filter of a page, drawn like the other filter chips but with no remove button and no menu: it is
 * always applied, only its value can be edited. One control for presets and for a custom day range, so a page never
 * has a second period control. On a phone the popover is a bottom drawer (the shared `Popover`).
 */
export function DateFilterChip({
  date,
  disabled,
  className,
}: {
  date: DateFilterState;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const range: DateRange | undefined =
    date.period === "custom"
      ? { from: isoToCalendarDate(date.dateFrom), to: isoToCalendarDate(date.dateTo) }
      : undefined;

  return (
    <div data-slot="date-filter" className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="max-w-full gap-2 border-border bg-card font-normal shadow-xs hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50"
            aria-label={`Date: ${date.label}${date.rangeText && date.period !== "custom" ? ` (${date.rangeText})` : ""}. Edit`}
          >
            <HugeiconsIcon
              icon={Calendar01Icon}
              strokeWidth={2}
              className="text-primary dark:text-primary"
            />
            <span className="truncate font-medium">{date.label}</span>
            {date.period !== "custom" && date.rangeText ? (
              <span className="hidden truncate text-muted-foreground tabular-nums sm:inline">
                {date.rangeText}
              </span>
            ) : null}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className="text-muted-foreground"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-auto flex-col p-0 sm:flex-row">
          <ul className="flex max-h-72 flex-row gap-1 overflow-auto border-b p-2 sm:max-h-none sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
            {PREFERRED_PERIOD_OPTIONS.map((option) => (
              <li key={option.value}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start font-normal whitespace-nowrap",
                    date.period === option.value && "bg-muted font-medium",
                  )}
                  onClick={() => {
                    date.setPreset(option.value as PreferredPeriod);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </Button>
              </li>
            ))}
          </ul>
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="range"
            selected={range}
            onSelect={(value) => {
              if (!value) return;
              date.setRange(
                value.from ? calendarDateToIso(value.from) : undefined,
                value.to ? calendarDateToIso(value.to) : undefined,
              );
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
