import { z } from "zod";
import { currencyCodeSchema, idParamsSchema } from "../common.js";
import { commaSeparatedArraySchema } from "../list.js";
import {
  recurringBillFrequencySchema,
  recurringBillStatusSchema,
  recurringBillTypeSchema,
} from "./resource.js";

const dateSchema = z.coerce.date();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
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
  .object({ ...baseBillFields, status: recurringBillStatusSchema.optional() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const occurrenceParamsSchema = z.object({ id: z.uuid(), date: isoDateSchema });
export const listRecurringBillsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: commaSeparatedArraySchema(recurringBillStatusSchema).optional(),
  type: commaSeparatedArraySchema(recurringBillTypeSchema).optional(),
  sort: z.enum(["name", "amount", "startDate", "createdAt", "updatedAt"]).default("startDate"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});
export const listRecurringOccurrencesQuerySchema = z.object({
  search: z.string().trim().optional(),
  from: isoDateSchema,
  to: isoDateSchema,
});
export const rescheduleOccurrenceBodySchema = z.object({ date: isoDateSchema });
export const recurringBillIdParamsSchema = idParamsSchema;

export type ListRecurringBillsQuery = z.input<typeof listRecurringBillsQuerySchema>;
export type ListRecurringOccurrencesQuery = z.input<typeof listRecurringOccurrencesQuerySchema>;
export type CreateRecurringBillInput = z.input<typeof createRecurringBillBodySchema>;
export type UpdateRecurringBillInput = z.input<typeof updateRecurringBillBodySchema>;
export type RecurringBillParams = z.input<typeof recurringBillIdParamsSchema>;
export type OccurrenceParams = z.input<typeof occurrenceParamsSchema>;
export type RescheduleOccurrenceInput = z.input<typeof rescheduleOccurrenceBodySchema>;
