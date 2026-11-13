"use client";

import { ArrowDown01Icon, Calendar01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PREFERRED_PERIOD_OPTIONS } from "@luraba/contracts";
import type { PreferredPeriod } from "@luraba/domain";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import type { DateFilterState } from "@/components/filters/use-date-filter";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/side-panel/side-panel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";

const TRIGGER_CLASS =
  "max-w-44 gap-2 border-border bg-card font-normal shadow-xs hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50";

/**
 * The required date filter of a page, drawn like the other filter controls but with no remove button and no menu: it
 * is always applied, only its value can be edited. The trigger is ONE short label with the calendar icon ("This
 * month", or the compact range of a custom pick), capped in width; the full range is its tooltip and the heading of
 * the popover. One control for presets and for a custom day range, so a page never has a second period control.
 *
 * Desktop: a popover with the presets as a vertical list beside a range calendar; a preset applies at once. Phone: a
 * bottom drawer with the same vertical list and the calendar in the scrolling body and a fixed "Apply" footer: a
 * pick only highlights until the user confirms it.
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
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const full = date.rangeText ? `${date.label}: ${date.rangeText}` : date.label;
  // A preset shows its name; a custom range shows the days themselves (already compact: "Nov 1 - Nov 30").
  const trigger = (
    <Button
      variant="outline"
      disabled={disabled}
      className={TRIGGER_CLASS}
      title={full}
      aria-label={`Date: ${full}. Edit`}
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="text-primary" />
      <span className="truncate font-medium">{date.label}</span>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        strokeWidth={2}
        className="text-muted-foreground max-sm:hidden"
      />
    </Button>
  );

  if (isMobile) {
    return (
      <div data-slot="date-filter" className={className}>
        {trigger}
        <DateFilterDrawer date={date} open={open} onOpenChange={setOpen} />
      </div>
    );
  }

  return (
    <div data-slot="date-filter" className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="end" className="flex w-auto flex-col p-0">
          {date.rangeText ? (
            <p className="border-b px-3 py-2 text-muted-foreground text-xs tabular-nums">
              {date.rangeText}
            </p>
          ) : null}
          <div className="flex flex-row">
            <ul className="flex w-40 shrink-0 flex-col gap-0.5 border-r p-2">
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
              selected={
                date.period === "custom"
                  ? { from: isoToCalendarDate(date.dateFrom), to: isoToCalendarDate(date.dateTo) }
                  : undefined
              }
              defaultMonth={isoToCalendarDate(date.dateFrom)}
              onSelect={(value) => {
                if (!value) return;
                date.setRange(
                  value.from ? calendarDateToIso(value.from) : undefined,
                  value.to ? calendarDateToIso(value.to) : undefined,
                );
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type Draft = { kind: "preset"; value: PreferredPeriod } | { kind: "range"; value: DateRange };

/**
 * Phone version of the date filter: a bottom drawer with a fixed header, one scrolling body (a vertical list of
 * presets, then the range calendar) and a fixed "Apply" footer. Nothing scrolls sideways.
 */
function DateFilterDrawer({
  date,
  open,
  onOpenChange,
}: {
  date: DateFilterState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = React.useState<Draft | null>(null);
  // Every opening starts from what is applied now.
  React.useEffect(() => {
    if (open) setDraft(null);
  }, [open]);

  const shownPreset: PreferredPeriod | null =
    draft?.kind === "preset"
      ? draft.value
      : draft === null && date.period !== "custom"
        ? date.period
        : null;
  const shownRange: DateRange | undefined =
    draft?.kind === "range"
      ? draft.value
      : draft === null && date.period === "custom"
        ? { from: isoToCalendarDate(date.dateFrom), to: isoToCalendarDate(date.dateTo) }
        : undefined;
  const canApply = draft?.kind === "preset" || Boolean(draft?.kind === "range" && draft.value.to);

  const apply = () => {
    if (draft?.kind === "preset") date.setPreset(draft.value);
    else if (draft?.kind === "range" && draft.value.from && draft.value.to) {
      date.setRange(calendarDateToIso(draft.value.from), calendarDateToIso(draft.value.to));
    }
    onOpenChange(false);
  };

  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      <SidePanelContent>
        <SidePanelHeader>
          <SidePanelTitle className="text-base">Date range</SidePanelTitle>
        </SidePanelHeader>
        <SidePanelBody className="space-y-4">
          <ul className="flex flex-col gap-1.5" aria-label="Presets">
            {PREFERRED_PERIOD_OPTIONS.map((option) => {
              const selected = shownPreset === option.value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-[var(--color-container-inset)] px-3 py-2 text-left text-sm active:bg-accent",
                      selected && "border-primary",
                    )}
                    onClick={() =>
                      setDraft({ kind: "preset", value: option.value as PreferredPeriod })
                    }
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {selected ? (
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2 border-t border-border/70 pt-4">
            <p className="font-medium text-sm">Custom range</p>
            <div className="flex min-w-0 justify-center">
              <Calendar
                captionLayout="dropdown"
                mode="range"
                selected={shownRange}
                defaultMonth={shownRange?.from ?? isoToCalendarDate(date.dateFrom)}
                onSelect={(value) => value && setDraft({ kind: "range", value })}
              />
            </div>
          </div>
        </SidePanelBody>
        <SidePanelFooter>
          <Button disabled={!canApply} onClick={apply}>
            Apply
          </Button>
        </SidePanelFooter>
      </SidePanelContent>
    </SidePanel>
  );
}
