"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonthKeyLabel, shiftMonthKey } from "@/lib/credit-card-invoices";

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

/** Month + year picker with previous/next buttons. Values are `YYYY-MM` keys. */
export function MonthSelector({
  value,
  onChange,
  minMonth,
  maxMonth,
  language = "en",
}: {
  value: string;
  onChange: (monthKey: string) => void;
  minMonth?: string;
  maxMonth?: string;
  language?: string;
}) {
  const [year, month] = value.split("-");
  const firstYear = Number((minMonth ?? shiftMonthKey(value, -60)).slice(0, 4));
  const lastYear = Number((maxMonth ?? shiftMonthKey(value, 60)).slice(0, 4));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);

  const clamp = (key: string) => {
    if (minMonth && key < minMonth) return minMonth;
    if (maxMonth && key > maxMonth) return maxMonth;
    return key;
  };
  const previous = shiftMonthKey(value, -1);
  const next = shiftMonthKey(value, 1);

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous month"
        disabled={Boolean(minMonth && previous < minMonth)}
        onClick={() => onChange(previous)}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
      </Button>
      <Select value={month} onValueChange={(nextMonth) => onChange(clamp(`${year}-${nextMonth}`))}>
        <SelectTrigger aria-label="Month" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((option) => (
            <SelectItem key={option} value={option}>
              {formatMonthKeyLabel(`2000-${option}`, language).replace(/ 2000$/, "")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={(nextYear) => onChange(clamp(`${nextYear}-${month}`))}>
        <SelectTrigger aria-label="Year" className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next month"
        disabled={Boolean(maxMonth && next > maxMonth)}
        onClick={() => onChange(next)}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
      </Button>
    </div>
  );
}
