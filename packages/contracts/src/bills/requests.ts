import { z } from "zod";
import {
  currencyCodeSchema,
  dateInputSchema,
  idParamsSchema,
  moneyAmountSchema,
} from "../common.js";
import { createListQuerySchema, dateQuerySchema, validateRange } from "../list.js";
import { BILL_STATUSES, billAudienceSchema, billFrequencySchema } from "./catalog.js";

export const billIdParamsSchema = idParamsSchema;
export const billOccurrenceParamsSchema = z.object({
  id: z.uuid(),
  occurrenceId: z.uuid(),
});

const billFields = {
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  expectedAmount: moneyAmountSchema,
  currencyCode: currencyCodeSchema,
  frequency: billFrequencySchema,
  /** 1-31; short months clamp to their last day. Required for monthly, quarterly and yearly bills. */
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  /** 0 = Sunday ... 6 = Saturday. Used by weekly and biweekly bills. */
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  startDate: dateInputSchema,
  endDate: dateInputSchema.nullable().optional(),
  /** Total number of payments for a finite plan such as a loan; omit for open-ended bills. */
  installmentCount: z.number().int().min(1).max(1200).nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  merchantId: z.uuid().nullable().optional(),
  /** Days before the due date to send an extra reminder; null sends only the due-day reminder. */
  remindDaysBefore: z.number().int().min(1).max(30).nullable().optional(),
  audience: billAudienceSchema.optional(),
};

function refineSchedule(
  value: {
    frequency?: string;
    dayOfMonth?: number | null;
    endDate?: unknown;
    installmentCount?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const monthly =
    value.frequency === "monthly" ||
    value.frequency === "quarterly" ||
    value.frequency === "yearly";
  if (monthly && value.dayOfMonth === null) {
    ctx.addIssue({ code: "custom", path: ["dayOfMonth"], message: "Choose the day of the month" });
  }
  if (value.endDate && value.installmentCount) {
    ctx.addIssue({
      code: "custom",
      path: ["installmentCount"],
      message: "Use either an end date or an installment count, not both",
    });
  }
}

export const createBillBodySchema = z
  .object({
    ...billFields,
    /** Marks the first N occurrences as already paid, for plans that started before Luraba. */
    alreadyPaidCount: z.number().int().min(0).max(1200).optional(),
  })
  .superRefine(refineSchedule)
  .superRefine((value, ctx) => {
    if (value.alreadyPaidCount && value.alreadyPaidCount > (value.installmentCount ?? Infinity)) {
      ctx.addIssue({
        code: "custom",
        path: ["alreadyPaidCount"],
        message: "Cannot be more than the installment count",
      });
    }
  });

export const updateBillBodySchema = z
  .object(
    Object.fromEntries(
      Object.entries(billFields).map(([key, schema]) => [key, schema.optional()]),
    ) as { [K in keyof typeof billFields]: z.ZodOptional<(typeof billFields)[K]> },
  )
  .superRefine(refineSchedule)
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const listBillsQuerySchema = createListQuerySchema(
  { status: z.enum(BILL_STATUSES).optional() },
  ["name", "expectedAmount", "createdAt"],
);

export const listBillOccurrencesQuerySchema = createListQuerySchema(
  {
    from: dateQuerySchema.optional(),
    to: dateQuerySchema.optional(),
    state: z.enum(["scheduled", "overdue", "paid", "skipped"]).optional(),
  },
  ["dueDate"],
).superRefine((query, ctx) => validateRange(query, ctx, "from", "to"));

export const billForecastQuerySchema = z
  .object({ from: dateQuerySchema, to: dateQuerySchema })
  .superRefine((query, ctx) => validateRange(query, ctx, "from", "to"));

export const linkBillOccurrenceBodySchema = z.object({ transactionId: z.uuid() });

export const updateBillOccurrenceBodySchema = z.object({
  expectedAmount: moneyAmountSchema,
});

export type CreateBillInput = z.input<typeof createBillBodySchema>;
export type UpdateBillInput = z.input<typeof updateBillBodySchema>;
export type ListBillsQuery = z.input<typeof listBillsQuerySchema>;
export type ListBillOccurrencesQuery = z.input<typeof listBillOccurrencesQuerySchema>;
export type BillForecastQuery = z.input<typeof billForecastQuerySchema>;
export type LinkBillOccurrenceInput = z.input<typeof linkBillOccurrenceBodySchema>;
export type UpdateBillOccurrenceInput = z.input<typeof updateBillOccurrenceBodySchema>;
