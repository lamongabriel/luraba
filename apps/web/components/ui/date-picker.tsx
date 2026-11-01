"use client";

import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatShortDate } from "@luraba/domain";
import * as React from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";

export type DatePickerProps = Omit<
  React.ComponentProps<"button">,
  "value" | "onChange" | "type" | "children"
> & {
  /** A calendar date, `YYYY-MM-DD`, or empty. */
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Locale used to print the chosen day. */
  language?: string;
  /** Earliest and latest selectable day, `YYYY-MM-DD`. */
  min?: string;
  max?: string;
};

/**
 * A calendar date field: a button that shows the day and opens a calendar in a popover. Shares the
 * `Input` look, carries `YYYY-MM-DD` strings (same contract as the old native date input) and is
 * what `DateInput` and `FormItem inputType="date"` render.
 */
export function DatePicker({
  value,
  onValueChange,
  placeholder = "Pick a date",
  language = "en",
  min,
  max,
  className,
  disabled,
  onBlur,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = isoToCalendarDate(value);
  const minDate = isoToCalendarDate(min);
  const maxDate = isoToCalendarDate(max);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          {...props}
          type="button"
          data-slot="date-picker"
          disabled={disabled}
          onBlur={onBlur}
          className={cn(
            "flex h-7 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border/90 bg-[var(--color-container-inset)] px-2.5 py-1 text-left text-xs font-normal transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selected && value ? formatShortDate(value, language) : placeholder}
          </span>
          <HugeiconsIcon
            icon={Calendar01Icon}
            strokeWidth={2}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          onSelect={(date) => {
            if (!date) return;
            onValueChange(calendarDateToIso(date));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
