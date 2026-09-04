import { z } from "zod";
import { currencyCodeSchema } from "../common.js";

export const recurringBillTypeSchema = z.enum(["income", "expense"]);
export const recurringBillStatusSchema = z.enum(["active", "paused", "archived"]);
export const recurringBillFrequencySchema = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);
export const recurringBillOccurrenceStatusSchema = z.enum([
  "scheduled",
  "skipped",
  "created",
  "rescheduled",
]);
export const recurringBillSchema = z.object({
  id: z.uuid(),
  householdId: z.uuid(),
  ownerUserId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  type: recurringBillTypeSchema,
  status: recurringBillStatusSchema,
  accountId: z.uuid(),
  categoryId: z.uuid().nullable(),
  merchantId: z.uuid().nullable(),
  paymentMethodId: z.uuid().nullable(),
  amount: z.number().int(),
  currencyCode: currencyCodeSchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
  frequency: recurringBillFrequencySchema,
  dayOfMonth: z.number().int().nullable(),
  dayOfWeek: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const recurringOccurrenceSchema = z.object({
  id: z.uuid(),
  recurringBillId: z.uuid(),
  occurrenceDate: z.string(),
  effectiveDate: z.string(),
  status: recurringBillOccurrenceStatusSchema,
  rescheduledDate: z.string().nullable(),
  transactionId: z.uuid().nullable(),
});

export type RecurringBill = z.output<typeof recurringBillSchema>;
export type RecurringOccurrence = z.output<typeof recurringOccurrenceSchema>;
export type RecurringBillType = z.output<typeof recurringBillTypeSchema>;
export type RecurringBillStatus = z.output<typeof recurringBillStatusSchema>;
export type RecurringBillFrequency = z.output<typeof recurringBillFrequencySchema>;
