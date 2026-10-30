"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A small single-choice toggle group (periods, dimensions, views). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5", className)}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          size="sm"
          variant={option.value === value ? "secondary" : "ghost"}
          className={cn(option.value === value && "shadow-xs")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
