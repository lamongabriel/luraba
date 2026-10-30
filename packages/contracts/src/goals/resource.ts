import { z } from "zod";
import { createdByUserIdSchema, wireDateTimeSchema } from "../common.js";
import { goalKindSchema, goalStateSchema, goalStatusSchema } from "./catalog.js";

const wireDateSchema = z.string();

export const goalLinkedTransactionSchema = z.object({
  id: z.uuid(),
  description: z.string(),
  amount: z.number().int(),
  currencyCode: z.string(),
  postedDate: wireDateSchema,
});

export const goalContributionSchema = z.object({
  id: z.uuid(),
  /** Negative for a withdrawal. */
  amount: z.number().int(),
  contributedOn: wireDateSchema,
  note: z.string().nullable(),
  transaction: goalLinkedTransactionSchema.nullable(),
  createdAt: wireDateTimeSchema,
});

export const goalEstimateSchema = z.object({
  remaining: z.number().int(),
  /** 0 to 100; stays below 100 until the target is reached. */
  percent: z.number().int(),
  monthsLeft: z.number().int().nullable(),
  /** What must go in every month to reach the target by the target date. */
  requiredMonthly: z.number().int().nullable(),
  /** When the monthly plan reaches the target. */
  projectedCompletionDate: wireDateSchema.nullable(),
  /** Value on the target date if the plan is followed (with returns for investments). */
  projectedAtTargetDate: z.number().int().nullable(),
  shortfall: z.number().int().nullable(),
  /** What a steady pace would have saved by today. */
  expectedSaved: z.number().int().nullable(),
  onTrack: z.boolean().nullable(),
});

export const goalTimelinePointSchema = z.object({
  date: wireDateSchema,
  /** Recorded contributions up to this date; null for future dates. */
  actual: z.number().int().nullable(),
  /** Where the plan leads; null for past dates. */
  projected: z.number().int().nullable(),
});

export const goalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  kind: goalKindSchema,
  status: goalStatusSchema,
  /** Derived: status first, then achieved, on track, behind or open. */
  state: goalStateSchema,
  targetAmount: z.number().int(),
  currencyCode: z.string(),
  startDate: wireDateSchema,
  targetDate: wireDateSchema.nullable(),
  monthlyContribution: z.number().int().nullable(),
  expectedReturnBps: z.number().int().nullable(),
  accountId: z.uuid().nullable(),
  /** The sum of all contributions. */
  saved: z.number().int(),
  contributionCount: z.number().int(),
  lastContributionOn: wireDateSchema.nullable(),
  /** The date the contributions first reached the target; null while below it. */
  achievedOn: wireDateSchema.nullable(),
  estimate: goalEstimateSchema,
  createdByUserId: createdByUserIdSchema,
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});

export const goalDetailSchema = goalSchema.extend({
  contributions: z.array(goalContributionSchema),
  timeline: z.array(goalTimelinePointSchema),
});

export type GoalLinkedTransaction = z.output<typeof goalLinkedTransactionSchema>;
export type GoalContribution = z.output<typeof goalContributionSchema>;
export type GoalEstimate = z.output<typeof goalEstimateSchema>;
export type GoalTimelinePoint = z.output<typeof goalTimelinePointSchema>;
export type Goal = z.output<typeof goalSchema>;
export type GoalDetail = z.output<typeof goalDetailSchema>;
