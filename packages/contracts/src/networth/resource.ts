import { z } from "zod";
import { currencyCodeSchema } from "../common.js";

const dateSchema = z.iso.date();
const amountSchema = z.object({ amount: z.number().int(), currencyCode: currencyCodeSchema });
export const netWorthSummarySchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencyCodeSchema,
  totalBalance: amountSchema,
  assets: amountSchema,
  liabilities: amountSchema,
  netWorth: amountSchema,
  income: amountSchema,
  expenses: amountSchema,
  transferCount: z.number().int(),
});
export const netWorthHistorySchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencyCodeSchema,
  granularity: z.enum(["day", "week", "month"]),
  points: z.array(z.object({ date: dateSchema, netWorth: z.number().int() })),
});
const accountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.string(),
  currencyCode: currencyCodeSchema,
  balance: z.number().int(),
});
export const netWorthAccountsSchema = z.object({
  displayCurrencyCode: currencyCodeSchema,
  assets: z.array(accountSchema),
  liabilities: z.array(accountSchema),
});
export const netWorthCashFlowSchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencyCodeSchema,
  granularity: z.enum(["day", "week", "month"]),
  points: z.array(
    z.object({ date: dateSchema, income: z.number().int(), expenses: z.number().int() }),
  ),
});
export const netWorthBreakdownSchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencyCodeSchema,
  items: z.array(
    z.object({
      id: z.uuid().nullable(),
      name: z.string(),
      amount: z.number().int(),
      percentage: z.number(),
    }),
  ),
});
export const netWorthRecentActivitySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
});
export const netWorthCreditCardsSchema = z.object({
  displayCurrencyCode: currencyCodeSchema,
  cards: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      brand: z.string(),
      last4: z.string(),
      currencyCode: currencyCodeSchema,
      creditLimitAmount: z.number().int(),
      balance: z.number().int(),
      remainingAmount: z.number().int(),
      utilizationPercentage: z.number(),
    }),
  ),
});
export type NetWorthSummary = z.output<typeof netWorthSummarySchema>;
export type NetWorthHistory = z.output<typeof netWorthHistorySchema>;
export type NetWorthAccounts = z.output<typeof netWorthAccountsSchema>;
export type NetWorthCashFlow = z.output<typeof netWorthCashFlowSchema>;
export type NetWorthBreakdown = z.output<typeof netWorthBreakdownSchema>;
export type NetWorthRecentActivity = z.output<typeof netWorthRecentActivitySchema>;
export type NetWorthCreditCards = z.output<typeof netWorthCreditCardsSchema>;
