/**
 * Whether a goal is ahead of or behind pace. Pure (today is passed in) so it is unit tested; the Goals page
 * and the goal drawer both read it.
 *
 * - With a **target date**: a steady pace saves `targetAmount` evenly from `startDate` to `targetDate`. The goal
 *   is compared to where that pace would be today.
 * - With a **monthly plan** (no date): the pace is `monthlyContribution` per month since `startDate`.
 * - With neither, or once achieved, there is no pace (`none` / `achieved`).
 *
 * `onPace` is within 2% of the target of the steady pace. `expectedPercent` is where the pace marker sits on
 * the progress bar. `projectedDate` is when the current contribution rate (saved so far over the days elapsed)
 * reaches the target, `daysDifference` its distance to the target date (positive: early).
 */
export type GoalPaceStatus = "ahead" | "behind" | "on_pace" | "achieved" | "none";

export type GoalPace = {
  status: GoalPaceStatus;
  /** What the pace would have saved by today, minor units; null without a pace. */
  expectedSaved: number | null;
  /** Where the pace marker sits on the bar, 0-100; null without a pace. */
  expectedPercent: number | null;
  /** `saved - expectedSaved`: positive when ahead. */
  difference: number | null;
  /** When the current rate reaches the target (a target-date goal that has started saving), else null. */
  projectedDate: string | null;
  /** Target date minus projected date in days: positive is early, negative late. */
  daysDifference: number | null;
};

export const ON_PACE_TOLERANCE = 0.02;

type GoalPaceInput = {
  saved: number;
  targetAmount: number;
  startDate: string;
  targetDate: string | null;
  monthlyContribution: number | null;
  state: string;
};

const DAY_MS = 86_400_000;
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY_MS);
const isoOfDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

function monthsElapsed(startDate: string, today: string): number {
  const [startYear, startMonth] = startDate.split("-").map(Number) as [number, number];
  const [year, month] = today.split("-").map(Number) as [number, number];
  // The month of the start counts as the first contribution month.
  return Math.max(0, (year - startYear) * 12 + (month - startMonth) + 1);
}

export function goalPace(goal: GoalPaceInput, today: string): GoalPace {
  const none: GoalPace = {
    status: "none",
    expectedSaved: null,
    expectedPercent: null,
    difference: null,
    projectedDate: null,
    daysDifference: null,
  };
  if (goal.state === "achieved" || goal.saved >= goal.targetAmount) {
    return { ...none, status: "achieved" };
  }
  if (goal.state === "paused" || goal.state === "canceled" || goal.targetAmount <= 0) return none;

  let expectedSaved: number;
  let projectedDate: string | null = null;
  let daysDifference: number | null = null;

  if (goal.targetDate) {
    const start = dayNumber(goal.startDate);
    const end = dayNumber(goal.targetDate);
    const now = dayNumber(today);
    const span = Math.max(1, end - start);
    const elapsed = Math.min(span, Math.max(0, now - start));
    expectedSaved = Math.round((goal.targetAmount * elapsed) / span);
    if (goal.saved > 0 && now > start) {
      const rate = goal.saved / (now - start);
      const finish = start + Math.ceil(goal.targetAmount / rate);
      projectedDate = isoOfDay(finish);
      daysDifference = end - finish;
    }
    if (now > end) {
      return {
        status: "behind",
        expectedSaved: goal.targetAmount,
        expectedPercent: 100,
        difference: goal.saved - goal.targetAmount,
        projectedDate,
        daysDifference,
      };
    }
  } else if (goal.monthlyContribution && goal.monthlyContribution > 0) {
    expectedSaved = Math.min(
      goal.targetAmount,
      goal.monthlyContribution * monthsElapsed(goal.startDate, today),
    );
  } else {
    return none;
  }

  const difference = goal.saved - expectedSaved;
  const status: GoalPaceStatus =
    Math.abs(difference) <= goal.targetAmount * ON_PACE_TOLERANCE
      ? "on_pace"
      : difference > 0
        ? "ahead"
        : "behind";
  return {
    status,
    expectedSaved,
    expectedPercent: Math.min(100, Math.max(0, (expectedSaved / goal.targetAmount) * 100)),
    difference,
    projectedDate,
    daysDifference,
  };
}

export const GOAL_PACE_DISPLAY: Record<
  Exclude<GoalPaceStatus, "none">,
  { label: string; className: string }
> = {
  ahead: { label: "Ahead of pace", className: "text-emerald-600 dark:text-emerald-400" },
  on_pace: { label: "On pace", className: "text-emerald-600 dark:text-emerald-400" },
  behind: { label: "Behind pace", className: "text-destructive" },
  achieved: { label: "Goal reached", className: "text-emerald-600 dark:text-emerald-400" },
};
