"use client";

import { ArrowDown01Icon, Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PREFERRED_PERIOD_CATALOG, PREFERRED_PERIOD_OPTIONS } from "@luraba/contracts";
import { formatShortDate, getPreferredDateRange, type PreferredPeriod } from "@luraba/domain";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/stores/auth-session-store";

export type PeriodSelection = {
  /** A preset, or `custom` once the user picked days on the calendar. */
  period: PreferredPeriod | "custom";
  /** `YYYY-MM-DD`, or undefined for an open end (`all_time`). */
  dateFrom?: string;
  dateTo?: string;
};

/**
 * The period state of a page that filters a whole screen by dates (account detail, ...). Starts on
 * the user's preferred period and resolves presets to concrete days in the user's time zone with
 * the same helper the transactions page uses (`getPreferredDateRange`).
 */
export function usePeriodFilter(fallback: PreferredPeriod = "last_30_days") {
  const preferences = useAuthSessionStore((state) => state.user?.preferences);
  const timezone = preferences?.timezone ?? "UTC";
  const initial = (preferences?.preferredPeriod as PreferredPeriod | undefined) ?? fallback;
  const [selection, setSelection] = React.useState<PeriodSelection>(() => ({
    period: initial,
    ...getPreferredDateRange(initial, timezone),
  }));

  const selectPeriod = React.useCallback(
    (period: PreferredPeriod) =>
      setSelection({ period, ...getPreferredDateRange(period, timezone) }),
    [timezone],
  );
  const selectRange = React.useCallback(
    (dateFrom: string | undefined, dateTo: string | undefined) =>
      setSelection({ period: "custom", dateFrom, dateTo }),
    [],
  );

  return { selection, selectPeriod, selectRange };
}

/**
 * The one period control of a page: a single button that names the period ("Last 30 days" or the
 * custom days) and opens a popover with the presets beside a day-range calendar. Both drive the same
 * `PeriodSelection`, so there is never a second control for the same thing.
 */
export function PeriodFilter({
  selection,
  onPeriodChange,
  onRangeChange,
  disabled,
  language = "en",
}: {
  selection: PeriodSelection;
  onPeriodChange: (period: PreferredPeriod) => void;
  onRangeChange: (dateFrom: string | undefined, dateTo: string | undefined) => void;
  disabled?: boolean;
  language?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const range: DateRange | undefined =
    selection.period === "custom"
      ? { from: isoToCalendarDate(selection.dateFrom), to: isoToCalendarDate(selection.dateTo) }
      : undefined;
  const label =
    selection.period === "custom"
      ? [selection.dateFrom, selection.dateTo]
          .filter((day): day is string => Boolean(day))
          .map((day) => formatShortDate(day, language))
          .join(" - ") || "Custom range"
      : PREFERRED_PERIOD_CATALOG[selection.period].label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled} aria-label={`Period: ${label}`}>
          <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
          <span>{label}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-auto flex-col p-0 sm:flex-row">
        <ul className="flex max-h-72 flex-row gap-1 overflow-auto border-b p-2 sm:max-h-none sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
          {PREFERRED_PERIOD_OPTIONS.map((option) => (
            <li key={option.value}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start whitespace-nowrap font-normal",
                  selection.period === option.value && "bg-muted font-medium",
                )}
                onClick={() => {
                  onPeriodChange(option.value as PreferredPeriod);
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
            onRangeChange(
              value.from ? calendarDateToIso(value.from) : undefined,
              value.to ? calendarDateToIso(value.to) : undefined,
            );
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
