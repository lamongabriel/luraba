import { z } from "zod";

/** savings: money set aside. investment: money put to work, optionally with an expected return. */
export const GOAL_KINDS = ["savings", "investment"] as const;
export const GOAL_STATUSES = ["active", "paused", "canceled"] as const;
/**
 * achieved: the target is reached.
 * on_track / behind: compared with the target date and the monthly plan.
 * open: no target date and no monthly plan, so there is nothing to compare with.
 * paused / canceled: the goal's own status, which wins over the rest.
 */
export const GOAL_STATES = [
  "achieved",
  "on_track",
  "behind",
  "open",
  "paused",
  "canceled",
] as const;

export const goalKindSchema = z.enum(GOAL_KINDS);
export const goalStatusSchema = z.enum(GOAL_STATUSES);
export const goalStateSchema = z.enum(GOAL_STATES);

export type GoalKind = z.output<typeof goalKindSchema>;
export type GoalStatus = z.output<typeof goalStatusSchema>;
export type GoalState = z.output<typeof goalStateSchema>;
