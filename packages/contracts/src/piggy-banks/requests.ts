import { z } from "zod";
import {
  currencyCodeSchema,
  dateInputSchema,
  hexColorSchema,
  idParamsSchema,
  moneyAmountSchema,
  moneyBalanceSchema,
} from "../common.js";
import { monthKeySchema } from "../goals/requests.js";
import { booleanQuerySchema } from "../list.js";
import {
  piggyBankCoverPresetSchema,
  piggyBankDayCountSchema,
  piggyBankLiquiditySchema,
  piggyBankMovementKindSchema,
  piggyBankTaxRegimeSchema,
  piggyBankYieldTypeSchema,
} from "./catalog.js";

export const piggyBankIdParamsSchema = idParamsSchema;

export const piggyBankYieldInputSchema = z.object({
  type: piggyBankYieldTypeSchema,
  /** A percentage: 102 = 102% of CDI, 6.5 = IPCA + 6.5% a.a., 12 = 12% a.a. */
  rate: z.coerce.number().min(0).max(1000),
  /** Defaults to 252 for CDI and Selic and 365 otherwise. */
  dayCount: piggyBankDayCountSchema.optional(),
  maturityDate: dateInputSchema.nullable().optional(),
  liquidity: piggyBankLiquiditySchema.optional(),
  taxRegime: piggyBankTaxRegimeSchema.optional(),
  applyIof: z.boolean().optional(),
});

const piggyBankFields = {
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  coverUploadId: z.uuid().nullable().optional(),
  coverPreset: piggyBankCoverPresetSchema.nullable().optional(),
  emoji: z.string().trim().min(1).max(16).nullable().optional(),
  color: hexColorSchema.nullable().optional(),
  yield: piggyBankYieldInputSchema.optional(),
};

export const createPiggyBankBodySchema = z.object({
  parentAccountId: z.uuid(),
  ...piggyBankFields,
  /** Money the piggy bank starts with, taken from the account's free balance (no transfer). */
  initialBalance: moneyAmountSchema.optional(),
});

export const updatePiggyBankBodySchema = z
  .object({ ...piggyBankFields, title: piggyBankFields.title })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const listPiggyBanksQuerySchema = z.object({
  parentAccountId: z.uuid().optional(),
  goalId: z.uuid().optional(),
  includeArchived: booleanQuerySchema.optional(),
});

export const piggyBankMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(20),
  kind: piggyBankMovementKindSchema.optional(),
});

/** Money into one piggy bank. `fromAccountId` null/absent: it comes from the parent account's free balance. */
export const depositToPiggyBankBodySchema = z.object({
  amount: moneyAmountSchema,
  fromAccountId: z.uuid().nullable().optional(),
  date: dateInputSchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

/** Money out of a piggy bank. `toAccountId` null/absent: it stays in the parent account as free balance. */
export const withdrawFromPiggyBankBodySchema = z.object({
  amount: moneyAmountSchema,
  toAccountId: z.uuid().nullable().optional(),
  date: dateInputSchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

/** One transfer into the parent account split across several of its piggy banks (a Pix split). */
export const bulkDepositBodySchema = z.object({
  fromAccountId: z.uuid().nullable().optional(),
  date: dateInputSchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
  allocations: z
    .array(z.object({ piggyBankId: z.uuid(), amount: moneyAmountSchema }))
    .min(1)
    .max(50),
});

export const movePiggyBankFundsBodySchema = z
  .object({
    fromPiggyBankId: z.uuid(),
    toPiggyBankId: z.uuid(),
    amount: moneyAmountSchema,
    date: dateInputSchema.optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (value) => value.fromPiggyBankId !== value.toPiggyBankId,
    "Pick two different piggy banks",
  );

/** The real balance the bank shows now; the difference becomes an adjustment. */
export const setPiggyBankBalanceBodySchema = z.object({
  balance: moneyBalanceSchema.refine((value) => value >= 0, "A balance cannot be negative"),
  date: dateInputSchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const piggyBanksReportQuerySchema = z.object({ month: monthKeySchema.optional() });

export const goalPiggyBanksParamsSchema = idParamsSchema;
export const setGoalPiggyBanksBodySchema = z.object({
  piggyBankIds: z.array(z.uuid()).max(50),
});

export const runPiggyBankAccrualBodySchema = z.object({
  /** Accrue up to and including this day (default: yesterday). */
  through: dateInputSchema.optional(),
});

export { currencyCodeSchema };

export type CreatePiggyBankInput = z.output<typeof createPiggyBankBodySchema>;
export type UpdatePiggyBankInput = z.output<typeof updatePiggyBankBodySchema>;
export type DepositToPiggyBankInput = z.output<typeof depositToPiggyBankBodySchema>;
export type WithdrawFromPiggyBankInput = z.output<typeof withdrawFromPiggyBankBodySchema>;
export type BulkDepositInput = z.output<typeof bulkDepositBodySchema>;
export type MovePiggyBankFundsInput = z.output<typeof movePiggyBankFundsBodySchema>;
export type SetPiggyBankBalanceInput = z.output<typeof setPiggyBankBalanceBodySchema>;
