"use client";

import type { BillOccurrence, BillStatus } from "@luraba/contracts";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Labels and tones of a bill payment's state and of a bill's own status. One place, so every list agrees. */
export const BILL_STATE_DISPLAY: Record<
  BillOccurrence["state"] | Exclude<BillStatus, "active">,
  { label: string; className: string }
> = {
  scheduled: { label: "Upcoming", className: "bg-muted text-muted-foreground" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground" },
  paused: { label: "Paused", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
};

/** The chip for a bill payment state (upcoming, overdue, paid, skipped) or a bill status (paused, canceled). */
export function BillStateDisplay({
  state,
  className,
}: {
  state: keyof typeof BILL_STATE_DISPLAY;
  className?: string;
}) {
  const config = BILL_STATE_DISPLAY[state];
  return <Badge className={cn(config.className, className)}>{config.label}</Badge>;
}
