import type { Goal, GoalKind } from "@luraba/contracts";

export const GOAL_STATE_LABELS: Record<Goal["state"], string> = {
  achieved: "Achieved",
  on_track: "On track",
  behind: "Behind",
  open: "In progress",
  paused: "Paused",
  canceled: "Canceled",
};

export const GOAL_STATE_BADGE: Record<
  Goal["state"],
  "default" | "destructive" | "outline" | "secondary"
> = {
  achieved: "default",
  on_track: "secondary",
  behind: "destructive",
  open: "outline",
  paused: "outline",
  canceled: "outline",
};

export const GOAL_KIND_OPTIONS: Array<{ value: GoalKind; label: string }> = [
  { value: "savings", label: "Save money" },
  { value: "investment", label: "Invest" },
];

export const GOAL_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "canceled", label: "Canceled" },
];

/** Basis points (700) to a percentage a person types (7). */
export const bpsToPercent = (bps: number) => bps / 100;
export const percentToBps = (percent: number) => Math.round(percent * 100);

/** Whole months as "1 year 2 months" style text. */
export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [
    years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : null,
    rest > 0 || years === 0 ? `${rest} ${rest === 1 ? "month" : "months"}` : null,
  ];
  return parts.filter(Boolean).join(" ");
}
