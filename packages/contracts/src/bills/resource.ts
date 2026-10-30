import { z } from "zod";
import { createdByUserIdSchema, wireDateTimeSchema } from "../common.js";
import {
  billAudienceSchema,
  billFrequencySchema,
  billOccurrenceStateSchema,
  billStatusSchema,
} from "./catalog.js";

const wireDateSchema = z.string();

export const billLinkedTransactionSchema = z.object({
  id: z.uuid(),
  description: z.string(),
  amount: z.number().int(),
  currencyCode: z.string(),
  postedDate: wireDateSchema,
});

export const billOccurrenceSchema = z.object({
  id: z.uuid(),
  billId: z.uuid(),
  dueDate: wireDateSchema,
  /** 1-based position in a finite plan; null for open-ended bills. */
  installmentNumber: z.number().int().nullable(),
  expectedAmount: z.number().int(),
  state: billOccurrenceStateSchema,
  /** Paid on this date; null while unpaid. */
  paidAt: wireDateTimeSchema.nullable(),
  skippedAt: wireDateTimeSchema.nullable(),
  transaction: billLinkedTransactionSchema.nullable(),
});

export const billSummarySchema = z.object({
  /** Occurrences that exist so far (all of them for a finite plan). */
  totalCount: z.number().int(),
  paidCount: z.number().int(),
  skippedCount: z.number().int(),
  overdueCount: z.number().int(),
  /** Remaining unpaid, unskipped payments in a finite plan; null for open-ended bills. */
  remainingCount: z.number().int().nullable(),
  nextDueDate: wireDateSchema.nullable(),
  nextExpectedAmount: z.number().int().nullable(),
  /** Sum of the linked transactions' amounts (same currency as the bill). */
  totalPaid: z.number().int(),
  averagePaid: z.number().int().nullable(),
  lastPaidAmount: z.number().int().nullable(),
});

export const billSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  expectedAmount: z.number().int(),
  currencyCode: z.string(),
  frequency: billFrequencySchema,
  dayOfMonth: z.number().int().nullable(),
  dayOfWeek: z.number().int().nullable(),
  startDate: wireDateSchema,
  endDate: wireDateSchema.nullable(),
  installmentCount: z.number().int().nullable(),
  status: billStatusSchema,
  categoryId: z.uuid().nullable(),
  merchantId: z.uuid().nullable(),
  remindDaysBefore: z.number().int().nullable(),
  audience: billAudienceSchema,
  summary: billSummarySchema,
  createdByUserId: createdByUserIdSchema,
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});

export const billForecastItemSchema = z.object({
  occurrenceId: z.uuid(),
  billId: z.uuid(),
  billName: z.string(),
  dueDate: wireDateSchema,
  expectedAmount: z.number().int(),
  currencyCode: z.string(),
  state: billOccurrenceStateSchema,
});

export const billForecastSchema = z.object({
  items: z.array(billForecastItemSchema),
  /** Expected totals per month and currency, ready for a chart. */
  months: z.array(
    z.object({
      month: z.string(),
      currencyCode: z.string(),
      expectedTotal: z.number().int(),
      count: z.number().int(),
    }),
  ),
});

export type Bill = z.output<typeof billSchema>;
export type BillSummary = z.output<typeof billSummarySchema>;
export type BillOccurrence = z.output<typeof billOccurrenceSchema>;
export type BillForecast = z.output<typeof billForecastSchema>;
