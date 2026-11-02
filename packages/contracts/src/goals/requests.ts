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

/** A calendar month as `YYYY-MM`. */
export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format");

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
  /** What you plan to put in every month; the estimate then gives the finish date. Not with a target date. */
  monthlyContribution: moneyAmountSchema.nullable().optional(),
  /** Investment goals only. */
  expectedReturnBps: expectedReturnBpsSchema.nullable().optional(),
  /** The account the money sits in, for reference. */
  accountId: z.uuid().nullable().optional(),
  /** The last month of the monthly plan (`YYYY-MM`); the start month is the start date's. */
  endMonth: monthKeySchema.nullable().optional(),
};

function refineGoal(
  value: {
    kind?: string;
    expectedReturnBps?: number | null;
    startDate?: unknown;
    targetDate?: unknown;
    monthlyContribution?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (value.monthlyContribution && value.targetDate) {
    ctx.addIssue({
      code: "custom",
      path: ["monthlyContribution"],
      message: "Plan with a monthly amount or a target date, not both",
    });
  }
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

const fxRateSchema = z.coerce.number().positive().max(1_000_000);
const accountIdSchema = z.uuid();

/**
 * Puts money toward a goal. The amount is in `currencyCode` (the goal's currency by default); in
 * another currency, `fxRate` (goal units per unit of that currency) converts it and is stored.
 * Creates a transfer from `fromAccountId` to `toAccountId` unless `transactionId` links one.
 */
export const contributeToGoalBodySchema = z.object({
  amount: moneyAmountSchema,
  currencyCode: currencyCodeSchema.optional(),
  fxRate: fxRateSchema.optional(),
  contributedOn: dateInputSchema.optional(),
  fromAccountId: accountIdSchema,
  toAccountId: accountIdSchema,
  /** An existing transfer that already moved this money; no new transfer is created. */
  transactionId: z.uuid().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

/** Moves a goal's money between two accounts. Progress does not change. */
export const moveGoalFundsBodySchema = z.object({
  amount: moneyAmountSchema,
  contributedOn: dateInputSchema.optional(),
  fromAccountId: accountIdSchema,
  toAccountId: accountIdSchema,
  transactionId: z.uuid().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

/**
 * Takes money out of a goal (progress drops). Link the expense it paid for with `expenseId`, or
 * give `toAccountId` to return the money to an account (a transfer is created).
 */
export const withdrawFromGoalBodySchema = z
  .object({
    amount: moneyAmountSchema.optional(),
    contributedOn: dateInputSchema.optional(),
    fromAccountId: accountIdSchema,
    toAccountId: accountIdSchema.optional(),
    expenseId: z.uuid().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => value.expenseId || value.toAccountId, {
    message: "Link the expense it paid for, or give the account the money goes to",
  })
  .refine((value) => value.amount !== undefined || value.expenseId, {
    message: "Enter an amount, or link the expense",
  });

export const goalsReportQuerySchema = z.object({ month: monthKeySchema.optional() });

export const listGoalsQuerySchema = createListQuerySchema(
  { status: goalStatusSchema.optional(), kind: goalKindSchema.optional() },
  ["name", "targetDate", "createdAt"],
);

export type CreateGoalInput = z.input<typeof createGoalBodySchema>;
export type UpdateGoalInput = z.input<typeof updateGoalBodySchema>;
export type CreateGoalContributionInput = z.input<typeof createGoalContributionBodySchema>;
export type UpdateGoalContributionInput = z.input<typeof updateGoalContributionBodySchema>;
export type ContributeToGoalInput = z.input<typeof contributeToGoalBodySchema>;
export type MoveGoalFundsInput = z.input<typeof moveGoalFundsBodySchema>;
export type WithdrawFromGoalInput = z.input<typeof withdrawFromGoalBodySchema>;
export type GoalsReportQuery = z.input<typeof goalsReportQuerySchema>;
export type ListGoalsQuery = z.input<typeof listGoalsQuerySchema>;
