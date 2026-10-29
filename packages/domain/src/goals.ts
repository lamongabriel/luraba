import {
  dateWithClampedDay,
  differenceInCalendarDays,
  formatISODate,
  getUTCDate,
  getUTCFullYear,
  getUTCMonth,
} from "./date.js";

/** Projections stop after this many months (50 years) so a tiny contribution cannot loop forever. */
export const MAX_GOAL_PROJECTION_MONTHS = 600;
/** The timeline never has more points than this, whatever the goal's length. */
export const MAX_GOAL_TIMELINE_POINTS = 120;

export type GoalPlan = {
  /** Minor units. */
  targetAmount: number;
  /** Contributions recorded so far, minor units. */
  saved: number;
  startDate: Date;
  targetDate: Date | null;
  /** Planned contribution per month, minor units. */
  monthlyContribution: number | null;
  /** Expected yearly return in basis points (700 = 7%); investment goals only. */
  expectedReturnBps: number | null;
  today: Date;
};

export type GoalEstimate = {
  remaining: number;
  /** 0 to 100, rounded down so a goal never shows 100 before it is reached. */
  percent: number;
  /** Whole months from today to the target date; null without a target date. */
  monthsLeft: number | null;
  /** What must go in every month to reach the target by the target date. */
  requiredMonthly: number | null;
  /** When the plan reaches the target; null without a monthly plan (or beyond 50 years). */
  projectedCompletionDate: Date | null;
  /** Value on the target date if the plan is followed, with returns when a rate is set. */
  projectedAtTargetDate: number | null;
  /** How far the plan falls short on the target date; 0 when it gets there. */
  shortfall: number | null;
  /** What a steady pace from the start date to the target date would have saved by today. */
  expectedSaved: number | null;
  /** Null when nothing can be compared (no target date and no monthly plan). */
  onTrack: boolean | null;
};

/** Whole calendar months that fit between two dates; never negative. */
export function wholeMonthsBetween(from: Date, to: Date): number {
  let months =
    (getUTCFullYear(to) - getUTCFullYear(from)) * 12 + (getUTCMonth(to) - getUTCMonth(from));
  if (getUTCDate(to) < getUTCDate(from)) months -= 1;
  return Math.max(0, months);
}

/** Same day-of-month `months` later, clamped to the end of shorter months. */
export function shiftMonths(date: Date, months: number): Date {
  const index = getUTCMonth(date) + months;
  const year = getUTCFullYear(date) + Math.floor(index / 12);
  return dateWithClampedDay(year, ((index % 12) + 12) % 12, getUTCDate(date));
}

function monthlyRate(expectedReturnBps: number | null): number {
  return expectedReturnBps ? expectedReturnBps / 10_000 / 12 : 0;
}

/** Value after one month: the balance grows, then the monthly contribution goes in. */
function nextBalance(balance: number, monthly: number, rate: number): number {
  return balance * (1 + rate) + monthly;
}

/**
 * Values at the end of each month from today while following the monthly plan.
 * Index 0 is today's balance, index n the balance after n monthly contributions.
 */
export function projectBalances(
  plan: Pick<GoalPlan, "saved" | "monthlyContribution" | "expectedReturnBps">,
  months: number,
): number[] {
  const rate = monthlyRate(plan.expectedReturnBps);
  const monthly = plan.monthlyContribution ?? 0;
  const balances = [plan.saved];
  let balance = plan.saved;
  for (let month = 1; month <= months; month += 1) {
    balance = nextBalance(balance, monthly, rate);
    balances.push(Math.round(balance));
  }
  return balances;
}

/** Months of following the plan until the balance reaches the target; null if never (or too far). */
export function monthsToReach(
  plan: Pick<GoalPlan, "targetAmount" | "saved" | "monthlyContribution" | "expectedReturnBps">,
): number | null {
  if (plan.saved >= plan.targetAmount) return 0;
  const monthly = plan.monthlyContribution ?? 0;
  if (monthly <= 0) return null; // returns alone are not a plan
  const rate = monthlyRate(plan.expectedReturnBps);

  let balance = plan.saved;
  for (let month = 1; month <= MAX_GOAL_PROJECTION_MONTHS; month += 1) {
    balance = nextBalance(balance, monthly, rate);
    if (Math.round(balance) >= plan.targetAmount) return month;
  }
  return null;
}

/** Monthly amount that grows to the target in `months`, counting the expected return. */
function requiredMonthlyFor(
  plan: Pick<GoalPlan, "targetAmount" | "saved" | "expectedReturnBps">,
  months: number,
): number {
  const rate = monthlyRate(plan.expectedReturnBps);
  if (rate <= 0) return Math.ceil(Math.max(0, plan.targetAmount - plan.saved) / months);

  const growth = (1 + rate) ** months;
  const needed = (plan.targetAmount - plan.saved * growth) * (rate / (growth - 1));
  return Math.max(0, Math.ceil(needed));
}

export function estimateGoal(plan: GoalPlan): GoalEstimate {
  const remaining = Math.max(0, plan.targetAmount - plan.saved);
  const percent =
    plan.targetAmount > 0
      ? Math.min(100, Math.floor((Math.max(0, plan.saved) / plan.targetAmount) * 100))
      : 0;
  const monthly =
    plan.monthlyContribution && plan.monthlyContribution > 0 ? plan.monthlyContribution : null;

  const monthsLeft = plan.targetDate ? wholeMonthsBetween(plan.today, plan.targetDate) : null;
  const dateIsAhead = plan.targetDate !== null && plan.targetDate > plan.today;
  const requiredMonthly =
    remaining > 0 && monthsLeft !== null && dateIsAhead
      ? requiredMonthlyFor(plan, Math.max(1, monthsLeft))
      : null;

  const monthsNeeded = monthsToReach({ ...plan, monthlyContribution: monthly });
  const projectedCompletionDate =
    monthsNeeded === null ? null : shiftMonths(plan.today, monthsNeeded);

  let projectedAtTargetDate: number | null = null;
  if (monthly !== null && monthsLeft !== null) {
    const balances = projectBalances({ ...plan, monthlyContribution: monthly }, monthsLeft);
    projectedAtTargetDate = balances[balances.length - 1] ?? plan.saved;
  } else if (monthsLeft !== null) {
    projectedAtTargetDate = plan.saved;
  }
  const shortfall =
    projectedAtTargetDate === null ? null : Math.max(0, plan.targetAmount - projectedAtTargetDate);

  let expectedSaved: number | null = null;
  if (plan.targetDate) {
    const span = differenceInCalendarDays(plan.targetDate, plan.startDate);
    const elapsed = differenceInCalendarDays(plan.today, plan.startDate);
    const fraction = span > 0 ? Math.min(1, Math.max(0, elapsed / span)) : 1;
    expectedSaved = Math.floor(plan.targetAmount * fraction);
  }

  let onTrack: boolean | null = null;
  if (remaining === 0) {
    onTrack = true;
  } else if (plan.targetDate && monthly !== null) {
    onTrack = projectedCompletionDate !== null && projectedCompletionDate <= plan.targetDate;
  } else if (plan.targetDate) {
    onTrack = plan.saved >= (expectedSaved ?? 0); // a date with no plan: compare with a steady pace
  }

  return {
    remaining,
    percent,
    monthsLeft,
    requiredMonthly,
    projectedCompletionDate,
    projectedAtTargetDate,
    shortfall,
    expectedSaved,
    onTrack,
  };
}

export type GoalContributionPoint = { date: Date; amount: number };

export type GoalTimelinePoint = {
  date: string;
  /** Contributions recorded up to this date; null for dates after today. */
  actual: number | null;
  /** Where the plan leads; null for dates before today. */
  projected: number | null;
};

/**
 * Monthly points for a progress chart: what was actually put in so far, then where the plan
 * leads, running to the target date or the projected completion, whichever is later.
 */
export function buildGoalTimeline(
  plan: GoalPlan,
  contributions: readonly GoalContributionPoint[],
): GoalTimelinePoint[] {
  const estimate = estimateGoal(plan);
  const monthsAhead = Math.min(
    MAX_GOAL_PROJECTION_MONTHS,
    Math.max(
      estimate.monthsLeft ?? 0,
      estimate.projectedCompletionDate
        ? wholeMonthsBetween(plan.today, estimate.projectedCompletionDate)
        : 0,
      plan.monthlyContribution ? 1 : 0,
    ),
  );
  const monthsBehind = Math.max(0, wholeMonthsBetween(plan.startDate, plan.today));
  const total = monthsBehind + monthsAhead;
  const stride = Math.max(1, Math.ceil(total / (MAX_GOAL_TIMELINE_POINTS - 1)));

  const balances = projectBalances(plan, monthsAhead);
  const sorted = [...contributions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const savedBy = (date: Date) =>
    sorted.reduce((sum, item) => (item.date <= date ? sum + item.amount : sum), 0);

  const points: GoalTimelinePoint[] = [];
  for (let offset = -monthsBehind; offset <= monthsAhead; offset += 1) {
    const isEdge = offset === -monthsBehind || offset === monthsAhead || offset === 0;
    if (!isEdge && (offset + monthsBehind) % stride !== 0) continue;

    const date = shiftMonths(plan.today, offset);
    points.push({
      date: formatISODate(date),
      actual: offset <= 0 ? savedBy(date) : null,
      projected: offset >= 0 ? (balances[offset] ?? null) : null,
    });
  }

  // Today's point carries the real total, not the date-shifted one.
  const todayPoint = points.find((point) => point.date === formatISODate(plan.today));
  if (todayPoint) todayPoint.actual = plan.saved;
  return points;
}
