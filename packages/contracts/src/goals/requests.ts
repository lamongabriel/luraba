import { z } from "zod";
import {
  currencyCodeSchema,
  dateInputSchema,
  idParamsSchema,
  MAX_SAFE_MINOR_UNITS,
  moneyAmountSchema,
} from "../common.js";
import { createListQuerySchema } from "../list.js";
import { goalKindSchema, goalStatusSchema } from "./catalog.js";

export const goalIdParamsSchema = idParamsSchema;
export const goalContributionParamsSchema = z.object({ id: z.uuid(), contributionId: z.uuid() });

/** Yearly return in basis points: 700 is 7%. */
const expectedReturnBpsSchema = z.number().int().min(0).max(10_000);

const goalFields = {
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  kind: goalKindSchema,
  targetAmount: moneyAmountSchema,
  currencyCode: currencyCodeSchema,
  /** Defaults to today. Contributions before this date still count. */
  startDate: dateInputSchema.optional(),
  targetDate: dateInputSchema.nullable().optional(),
  /** What you plan to put in every month; drives the completion estimate. */
  monthlyContribution: moneyAmountSchema.nullable().optional(),
  /** Investment goals only. */
  expectedReturnBps: expectedReturnBpsSchema.nullable().optional(),
  /** The account the money sits in, for reference. */
  accountId: z.uuid().nullable().optional(),
};

function refineGoal(
  value: {
    kind?: string;
    expectedReturnBps?: number | null;
    startDate?: unknown;
    targetDate?: unknown;
  },
  ctx: z.RefinementCtx,
) {
  if (value.expectedReturnBps && value.kind === "savings") {
    ctx.addIssue({
      code: "custom",
      path: ["expectedReturnBps"],
      message: "Only investment goals can have an expected return",
    });
  }
  if (
    value.startDate instanceof Date &&
    value.targetDate instanceof Date &&
    value.targetDate < value.startDate
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["targetDate"],
      message: "The target date cannot be before the start date",
    });
  }
}

export const createGoalBodySchema = z
  .object({ ...goalFields, kind: goalKindSchema.default("savings") })
  .superRefine(refineGoal);

export const updateGoalBodySchema = z
  .object({
    ...goalFields,
    status: goalStatusSchema,
  })
  .omit({ currencyCode: true })
  .partial()
  .superRefine(refineGoal)
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

/** Negative amounts are withdrawals. */
const contributionAmountSchema = z.coerce
  .number()
  .int()
  .min(-MAX_SAFE_MINOR_UNITS)
  .max(MAX_SAFE_MINOR_UNITS)
  .refine((value) => value !== 0, "The amount cannot be zero");

export const createGoalContributionBodySchema = z
  .object({
    /** Required unless a transaction is linked, which supplies it. */
    amount: contributionAmountSchema.optional(),
    /** Required unless a transaction is linked, which supplies its posted date. */
    contributedOn: dateInputSchema.optional(),
    note: z.string().trim().max(500).nullable().optional(),
    /** The transaction that moved this money. It can only back one contribution. */
    transactionId: z.uuid().nullable().optional(),
  })
  .refine(
    (value) => value.transactionId || (value.amount !== undefined && value.contributedOn),
    "Enter an amount and a date, or link a transaction",
  );

export const updateGoalContributionBodySchema = z
  .object({
    amount: contributionAmountSchema,
    contributedOn: dateInputSchema,
    note: z.string().trim().max(500).nullable(),
    transactionId: z.uuid().nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const listGoalsQuerySchema = createListQuerySchema(
  { status: goalStatusSchema.optional(), kind: goalKindSchema.optional() },
  ["name", "targetDate", "createdAt"],
);

export type CreateGoalInput = z.input<typeof createGoalBodySchema>;
export type UpdateGoalInput = z.input<typeof updateGoalBodySchema>;
export type CreateGoalContributionInput = z.input<typeof createGoalContributionBodySchema>;
export type UpdateGoalContributionInput = z.input<typeof updateGoalContributionBodySchema>;
export type ListGoalsQuery = z.input<typeof listGoalsQuerySchema>;
