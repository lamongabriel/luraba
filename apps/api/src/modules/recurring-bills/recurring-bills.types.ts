import { z } from 'zod';
import type {
  recurringBillOccurrencesTable,
  recurringBillsTable,
} from '@/db/schemas/recurring-bills.schema';

export type RecurringBillRecord = typeof recurringBillsTable.$inferSelect;
export type RecurringBillOccurrenceRecord = typeof recurringBillOccurrencesTable.$inferSelect;

const dateSchema = z.coerce.date();
const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

export const recurringBillTypeSchema = z.enum(['income', 'expense']);
export const recurringBillStatusSchema = z.enum(['active', 'paused', 'archived']);
export const recurringBillFrequencySchema = z.enum([
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);
export const recurringBillOccurrenceStatusSchema = z.enum([
  'scheduled',
  'skipped',
  'created',
  'rescheduled',
]);

export const listRecurringBillsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(recurringBillStatusSchema))
    .optional(),
  type: z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(recurringBillTypeSchema))
    .optional(),
  sort: z.enum(['name', 'amount', 'startDate', 'createdAt', 'updatedAt']).default('startDate'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});

const baseBillFields = {
  name: z.string().trim().min(1).max(255),
  description: z.string().max(4000).nullable().optional(),
  type: recurringBillTypeSchema,
  accountId: z.uuid(),
  categoryId: z.uuid().nullable().optional(),
  merchantId: z.uuid().nullable().optional(),
  paymentMethodCode: z.string().trim().min(1).max(32).optional(),
  amount: z.number().int().positive(),
  currencyCode: currencyCodeSchema,
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
  frequency: recurringBillFrequencySchema,
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
};

export const createRecurringBillBodySchema = z.object(baseBillFields);
export const updateRecurringBillBodySchema = z
  .object({
    ...baseBillFields,
    status: recurringBillStatusSchema.optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');
export const recurringBillParamsSchema = z.object({ id: z.uuid() });
export const occurrenceParamsSchema = z.object({
  id: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const rescheduleOccurrenceBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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
  currencyCode: z.string(),
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

export type ListRecurringBillsQuery = z.infer<typeof listRecurringBillsQuerySchema>;
export type CreateRecurringBillBody = z.infer<typeof createRecurringBillBodySchema>;
export type UpdateRecurringBillBody = z.infer<typeof updateRecurringBillBodySchema>;
export type RecurringBill = z.infer<typeof recurringBillSchema>;
export type RecurringOccurrence = z.infer<typeof recurringOccurrenceSchema>;
