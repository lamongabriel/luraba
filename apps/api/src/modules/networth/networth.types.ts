import { z } from 'zod';
import { currencySchema } from '@/shared/validation/preferences';

const dateSchema = z.iso.date();

export const NetWorthQuerySchema = z
  .object({
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    displayCurrencyCode: currencySchema.optional(),
    granularity: z.enum(['day', 'week', 'month']).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateFrom'],
        message: 'dateFrom must be before dateTo',
      });
    }
  });

export type NetWorthQuery = z.infer<typeof NetWorthQuerySchema>;

const amountSchema = z.object({
  amount: z.number().int(),
  currencyCode: currencySchema,
});

export const NetWorthSummarySchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencySchema,
  totalBalance: amountSchema,
  assets: amountSchema,
  liabilities: amountSchema,
  netWorth: amountSchema,
  income: amountSchema,
  expenses: amountSchema,
  transferCount: z.number().int(),
});

export const NetWorthHistorySchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencySchema,
  granularity: z.enum(['day', 'week', 'month']),
  points: z.array(z.object({ date: dateSchema, netWorth: z.number().int() })),
});

export const NetWorthAccountsSchema = z.object({
  displayCurrencyCode: currencySchema,
  assets: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      type: z.string(),
      currencyCode: currencySchema,
      balance: z.number().int(),
    }),
  ),
  liabilities: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      type: z.string(),
      currencyCode: currencySchema,
      balance: z.number().int(),
    }),
  ),
});

export const NetWorthCashFlowSchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencySchema,
  granularity: z.enum(['day', 'week', 'month']),
  points: z.array(
    z.object({ date: dateSchema, income: z.number().int(), expenses: z.number().int() }),
  ),
});

const breakdownItemSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string(),
  amount: z.number().int(),
  percentage: z.number(),
});

export const NetWorthBreakdownSchema = z.object({
  dateFrom: dateSchema,
  dateTo: dateSchema,
  displayCurrencyCode: currencySchema,
  items: z.array(breakdownItemSchema),
});

export const NetWorthRecentActivitySchema = z.object({
  rows: z.array(z.unknown()),
});

export const NetWorthCreditCardsSchema = z.object({
  displayCurrencyCode: currencySchema,
  cards: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      brand: z.string(),
      last4: z.string(),
      currencyCode: currencySchema,
      creditLimitAmount: z.number().int(),
      balance: z.number().int(),
      remainingAmount: z.number().int(),
      utilizationPercentage: z.number(),
    }),
  ),
});

export type NetWorthQueryResponse = z.infer<typeof NetWorthQuerySchema>;
