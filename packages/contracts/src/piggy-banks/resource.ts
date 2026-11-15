import { z } from "zod";
import { createdByUserIdSchema, wireDateTimeSchema } from "../common.js";
import {
  piggyBankCoverPresetSchema,
  piggyBankDayCountSchema,
  piggyBankLiquiditySchema,
  piggyBankMovementKindSchema,
  piggyBankTaxRegimeSchema,
  piggyBankYieldTypeSchema,
  piggyPlanModeSchema,
} from "./catalog.js";

const wireDateSchema = z.string();

export const piggyBankYieldSchema = z.object({
  type: piggyBankYieldTypeSchema,
  rate: z.number(),
  dayCount: piggyBankDayCountSchema,
  maturityDate: wireDateSchema.nullable(),
  liquidity: piggyBankLiquiditySchema,
  taxRegime: piggyBankTaxRegimeSchema,
  applyIof: z.boolean(),
  /** "102% CDI", "IPCA + 6.5%". */
  label: z.string(),
});

export const piggyBankGoalLinkSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  currencyCode: z.string(),
  targetAmount: z.number().int(),
  saved: z.number().int(),
  percent: z.number().int(),
});

export const piggyBankSchema = z.object({
  id: z.uuid(),
  parentAccountId: z.uuid(),
  parentAccountName: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverUploadId: z.uuid().nullable(),
  coverPreset: piggyBankCoverPresetSchema.nullable(),
  emoji: z.string().nullable(),
  color: z.string().nullable(),
  currencyCode: z.string(),
  yield: piggyBankYieldSchema,
  isUnallocated: z.boolean(),
  /** Sum of the movements, including accrued interest. */
  balance: z.number().int(),
  /** Interest posted from the first of this month up to today. */
  monthEarnings: z.number().int(),
  /** The last day interest was accrued, if any. */
  accruedThrough: wireDateSchema.nullable(),
  /** The goals this piggy bank counts toward, with their progress. */
  goals: z.array(piggyBankGoalLinkSchema),
  archivedAt: wireDateTimeSchema.nullable(),
  createdByUserId: createdByUserIdSchema,
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});

export const netIfWithdrawnSchema = z.object({
  gross: z.number().int(),
  gain: z.number().int(),
  ir: z.number().int(),
  iof: z.number().int(),
  net: z.number().int(),
});

export const piggyBankEarningsSchema = z.object({
  today: z.number().int(),
  month: z.number().int(),
  allTime: z.number().int(),
});

export const piggyProjectionPointSchema = z.object({
  date: wireDateSchema,
  balance: z.number().int(),
  deposits: z.number().int(),
  interest: z.number().int(),
  target: z.number().int(),
});

export const piggyBankDetailSchema = piggyBankSchema.extend({
  /** Balance before tax: the same as `balance`, kept explicit for the UI. */
  gross: z.number().int(),
  netIfWithdrawn: netIfWithdrawnSchema,
  earnings: piggyBankEarningsSchema,
  /** Expected yearly rate (a fraction) from today's index projections. */
  annualRate: z.number(),
  /** Average monthly net deposits over the last three full months. */
  averageMonthlyDeposit: z.number().int(),
  /** Next twelve months at the average deposit and the expected rate. */
  projection: z.array(piggyProjectionPointSchema),
});

export const piggyBankMovementSchema = z.object({
  id: z.uuid(),
  kind: piggyBankMovementKindSchema,
  /** Signed, in the piggy bank's currency. */
  amount: z.number().int(),
  occurredOn: wireDateSchema,
  estimated: z.boolean(),
  note: z.string().nullable(),
  transactionId: z.uuid().nullable(),
  groupId: z.uuid().nullable(),
  counterpart: z.object({ id: z.uuid(), title: z.string() }).nullable(),
  createdAt: wireDateTimeSchema,
});

export const piggyBankParentAccountSchema = z.object({
  accountId: z.uuid(),
  name: z.string(),
  currencyCode: z.string(),
  /** The account's real balance. */
  balance: z.number().int(),
  /** balance - piggy total: money in the account that no piggy bank holds. */
  free: z.number().int(),
  piggyTotal: z.number().int(),
  piggyBankCount: z.number().int(),
});

export const piggyBanksOverviewSchema = z.object({
  accounts: z.array(piggyBankParentAccountSchema),
  piggyBanks: z.array(piggyBankSchema),
});

/** What a money operation changed: the piggy banks involved, refreshed. */
export const piggyBankOperationSchema = z.object({
  piggyBanks: z.array(piggyBankDetailSchema),
  transactionId: z.uuid().nullable(),
  /** Set by `set balance`: what the adjustment added (negative: removed). */
  adjustment: z.number().int().nullable(),
});

export const piggyBankReportRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  parentAccountName: z.string(),
  currencyCode: z.string(),
  yieldLabel: z.string(),
  balance: z.number().int(),
  netIfWithdrawn: z.number().int(),
  earningsMonth: z.number().int(),
  earningsAllTime: z.number().int(),
  annualRate: z.number(),
  /** Balance in twelve months at the current rate with no new deposits. */
  projectedIn12Months: z.number().int(),
});

export const piggyBanksReportSchema = z.object({
  month: z.string(),
  piggyBanks: z.array(piggyBankReportRowSchema),
  totals: z.array(
    z.object({
      currencyCode: z.string(),
      balance: z.number().int(),
      earningsMonth: z.number().int(),
      earningsAllTime: z.number().int(),
    }),
  ),
});

export const piggyBankAccrualResultSchema = z.object({
  through: wireDateSchema,
  accrued: z.number().int(),
  skipped: z.number().int(),
  posted: z.number().int(),
});

// -------------------------------------------------------------------------- goals

export const goalPiggyBankSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  currencyCode: z.string(),
  balance: z.number().int(),
  /** In the goal's currency, converted with the FX service. */
  balanceInGoalCurrency: z.number().int(),
  annualRate: z.number(),
});

export const goalPiggyBanksSchema = z.object({
  goalId: z.uuid(),
  piggyBanks: z.array(goalPiggyBankSchema),
  /** Sum of `balanceInGoalCurrency`: the goal's progress while it has links. */
  saved: z.number().int(),
});

export const piggyPlanSchema = z.object({
  mode: piggyPlanModeSchema,
  monthly: z.number().int(),
  months: z.number().int().nullable(),
  finalValue: z.number().int().nullable(),
  deposited: z.number().int().nullable(),
  interest: z.number().int().nullable(),
  reachesTarget: z.boolean(),
});

export const piggyTrackingRowSchema = z.object({
  month: z.string(),
  planned: z.number().int(),
  actual: z.number().int(),
  difference: z.number().int(),
  cumulativePlanned: z.number().int(),
  cumulativeActual: z.number().int(),
  status: z.enum(["on_track", "behind", "ahead", "upcoming"]),
  catchUp: z.number().int(),
});

export const goalPiggyPlanSchema = z.object({
  goalId: z.uuid(),
  currencyCode: z.string(),
  targetAmount: z.number().int(),
  saved: z.number().int(),
  /** Balance-weighted yearly rate of the linked piggy banks (a fraction). */
  annualRate: z.number(),
  /** Null when the goal has neither a target date nor a monthly amount. */
  plan: piggyPlanSchema.nullable(),
  tracking: z
    .object({
      rows: z.array(piggyTrackingRowSchema),
      status: z.enum(["on_track", "behind", "ahead"]),
      catchUp: z.number().int(),
    })
    .nullable(),
  projection: z.array(piggyProjectionPointSchema),
  piggyBanks: z.array(goalPiggyBankSchema),
});

export type PiggyBank = z.output<typeof piggyBankSchema>;
export type PiggyBankDetail = z.output<typeof piggyBankDetailSchema>;
export type PiggyBankMovement = z.output<typeof piggyBankMovementSchema>;
export type PiggyBankParentAccount = z.output<typeof piggyBankParentAccountSchema>;
export type PiggyBanksOverview = z.output<typeof piggyBanksOverviewSchema>;
export type PiggyBankOperation = z.output<typeof piggyBankOperationSchema>;
export type PiggyBanksReport = z.output<typeof piggyBanksReportSchema>;
export type GoalPiggyBanks = z.output<typeof goalPiggyBanksSchema>;
export type GoalPiggyPlan = z.output<typeof goalPiggyPlanSchema>;
export type PiggyProjectionPoint = z.output<typeof piggyProjectionPointSchema>;
export type PiggyBankGoalLink = z.output<typeof piggyBankGoalLinkSchema>;
