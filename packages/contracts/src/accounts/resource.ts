import { z } from "zod";
import {
  createdByUserIdSchema,
  currencyCodeSchema,
  moneyBalanceSchema,
  wireDateTimeSchema,
} from "../common.js";
import {
  cashAccountDetailsSchema,
  cryptoAccountDetailsSchema,
  investmentAccountDetailsSchema,
  loanAccountDetailsSchema,
  otherAssetAccountDetailsSchema,
  otherLiabilityAccountDetailsSchema,
  propertyAccountDetailsSchema,
  vehicleAccountDetailsSchema,
} from "./profiles.js";
import { accountClassificationSchema, accountSubtypeSchema, accountTypeSchema } from "./values.js";

export const accountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  institutionName: z.string().nullable(),
  institutionDomain: z.string().nullable(),
  institutionLogoUrl: z.string().nullable(),
  /** An uploaded picture; shown instead of the institution logo or the type icon. */
  imageUploadId: z.uuid().nullable(),
  notes: z.string().nullable(),
  classification: accountClassificationSchema,
  type: accountTypeSchema,
  currencyCode: currencyCodeSchema,
  createdByUserId: createdByUserIdSchema,
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});
export const accountSummarySchema = accountSchema.extend({
  subtype: accountSubtypeSchema,
  balance: moneyBalanceSchema,
});
export const accountDetailsSchema = accountSchema.extend({
  type: accountTypeSchema.exclude(["credit_card"]),
  balance: moneyBalanceSchema,
  details: z.discriminatedUnion("kind", [
    cashAccountDetailsSchema,
    investmentAccountDetailsSchema,
    cryptoAccountDetailsSchema,
    propertyAccountDetailsSchema,
    vehicleAccountDetailsSchema,
    loanAccountDetailsSchema,
    otherAssetAccountDetailsSchema,
    otherLiabilityAccountDetailsSchema,
  ]),
});

export type Account = z.output<typeof accountSchema>;
export type AccountSummary = z.output<typeof accountSummarySchema>;
export type AccountDetails = z.output<typeof accountDetailsSchema>;

const insightsTotalsSchema = z.object({
  moneyIn: z.number().int(),
  moneyOut: z.number().int(),
  net: z.number().int(),
  totalSpent: z.number().int(),
});
const insightsBreakdownItemSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  amount: z.number().int(),
  percentage: z.number(),
});
/**
 * Account-scoped analytics for a date range, in the account's own currency. Amounts follow the
 * account's displayed sign: for a liability "money in" is what increased the debt. Balance
 * adjustments move the balance history but never count as money in, out or spent.
 */
export const accountInsightsSchema = z.object({
  currencyCode: currencyCodeSchema,
  classification: accountClassificationSchema,
  dateFrom: z.iso.date(),
  dateTo: z.iso.date(),
  bucket: z.enum(["day", "week", "month"]),
  balance: z.object({ opening: z.number().int(), closing: z.number().int() }),
  totals: insightsTotalsSchema.extend({
    transactionCount: z.number().int(),
    averageDailySpend: z.number().int(),
    /** (money in - money out) / money in, as a percentage; null without income. */
    savingsRate: z.number().nullable(),
    largestExpense: z
      .object({ description: z.string(), amount: z.number().int(), date: z.iso.date() })
      .nullable(),
  }),
  /** The period of the same length right before `dateFrom`; null when it predates the account. */
  previous: insightsTotalsSchema.nullable(),
  balanceHistory: z.array(z.object({ date: z.iso.date(), balance: z.number().int() })),
  cashFlow: z.array(
    z.object({ date: z.iso.date(), moneyIn: z.number().int(), moneyOut: z.number().int() }),
  ),
  categories: z.array(insightsBreakdownItemSchema),
  topMerchants: z.array(
    z.object({
      id: z.uuid().nullable(),
      name: z.string(),
      amount: z.number().int(),
      count: z.number().int(),
    }),
  ),
});
export type AccountInsights = z.output<typeof accountInsightsSchema>;
