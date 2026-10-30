"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export type StepperStep = {
  id: string;
  label: string;
  /** One short line under the label (for example "Not needed"). */
  description?: string;
  /** A step that cannot be shown for this flow; it stays in the list but is greyed out. */
  disabled?: boolean;
};

/**
 * A horizontal stepper: numbered indicators joined by a line, a check on finished steps. Controlled
 * through `current` (0-based). Finished steps are buttons when `onSelect` is given, so the user can
 * go back; later steps are never clickable.
 */
export function Stepper({
  steps,
  current,
  onSelect,
  className,
  label = "Progress",
}: {
  steps: readonly StepperStep[];
  current: number;
  onSelect?: (index: number) => void;
  className?: string;
  label?: string;
}) {
  return (
    <ol aria-label={label} className={cn("flex w-full items-start", className)}>
      {steps.map((step, index) => {
        const done = index < current && !step.disabled;
        const active = index === current;
        const clickable = done && Boolean(onSelect);
        const indicator = (
          <span
            data-state={active ? "active" : done ? "completed" : "inactive"}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
              active && "border-primary bg-primary text-primary-foreground",
              done && "border-primary bg-primary/10 text-primary",
              !active && !done && "text-muted-foreground",
              step.disabled && "opacity-50",
            )}
          >
            {done ? <HugeiconsIcon icon={Tick02Icon} className="size-3.5" /> : index + 1}
          </span>
        );
        const text = (
          <span className="min-w-0 text-left">
            <span
              className={cn(
                "block truncate text-xs font-medium",
                !active && !done && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {step.description ? (
              <span className="block truncate text-[0.6875rem] text-muted-foreground">
                {step.description}
              </span>
            ) : null}
          </span>
        );
        return (
          <React.Fragment key={step.id}>
            <li
              aria-current={active ? "step" : undefined}
              className={cn("flex min-w-0 items-center", index < steps.length - 1 && "flex-1")}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(index)}
                  className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {indicator}
                  <span className="hidden min-w-0 sm:block">{text}</span>
                </button>
              ) : (
                <span className="flex min-w-0 items-center gap-2">
                  {indicator}
                  <span className="hidden min-w-0 sm:block">{text}</span>
                </span>
              )}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn("mx-3 h-px flex-1", done ? "bg-primary/60" : "bg-border")}
                />
              ) : null}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}
