"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMonthKeyLabel, shiftMonthKey } from "@/lib/credit-card-invoices";
import { cn } from "@/lib/utils";

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

/**
 * One small date button (icon + "November 2026") that opens the month choices: presets (this month,
 * last month) and a month grid with year arrows. A popover on desktop, a bottom drawer on a phone (the
 * shared `Popover`). Values are `YYYY-MM` keys. The single period control of a month-based page.
 */
export function MonthPicker({
  value,
  onChange,
  currentMonth,
  minMonth,
  maxMonth,
  language = "en",
  disabled,
  className,
}: {
  value: string;
  onChange: (monthKey: string) => void;
  /** The real current month, for the presets. */
  currentMonth: string;
  minMonth?: string;
  maxMonth?: string;
  language?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(Number(value.slice(0, 4)));
  React.useEffect(() => {
    if (open) setYear(Number(value.slice(0, 4)));
  }, [open, value]);

  const outOfRange = (key: string) =>
    Boolean((minMonth && key < minMonth) || (maxMonth && key > maxMonth));
  const choose = (key: string) => {
    onChange(key);
    setOpen(false);
  };
  const presets = [
    { label: "This month", key: currentMonth },
    { label: "Last month", key: shiftMonthKey(currentMonth, -1) },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label={`Month: ${formatMonthKeyLabel(value, language)}. Change month`}
          className={cn("font-normal", className)}
        >
          <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
          <span>{formatMonthKeyLabel(value, language)}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Choose a month" className="w-72 gap-3 p-3">
        <div className="flex gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant={value === preset.key ? "secondary" : "outline"}
              size="sm"
              className="flex-1"
              disabled={outOfRange(preset.key)}
              onClick={() => choose(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous year"
            disabled={outOfRange(`${year - 1}-12`)}
            onClick={() => setYear((current) => current - 1)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <span className="text-sm font-medium">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next year"
            disabled={outOfRange(`${year + 1}-01`)}
            onClick={() => setYear((current) => current + 1)}
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
                variant={key === value ? "default" : "ghost"}
                size="sm"
                disabled={outOfRange(key)}
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
