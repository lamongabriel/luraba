import { z } from "zod";
import {
  currencyCodeSchema,
  dateInputSchema,
  idParamsSchema,
  moneyAmountSchema,
} from "../common.js";
import { createListQuerySchema } from "../list.js";
import { SPLIT_STATUSES } from "./catalog.js";

export const splitIdParamsSchema = idParamsSchema;
export const splitParticipantParamsSchema = z.object({ id: z.uuid(), participantId: z.uuid() });
export const splitInstallmentParamsSchema = z.object({
  id: z.uuid(),
  installmentId: z.uuid(),
});

export const splitInstallmentInputSchema = z.object({
  dueDate: dateInputSchema,
  expectedAmount: moneyAmountSchema,
  /** Optional extra days before it counts as overdue. */
  graceUntil: dateInputSchema.nullable().optional(),
});

export const splitParticipantInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(1000).nullable().optional(),
  installments: z.array(splitInstallmentInputSchema).max(1200),
});

export const createSplitBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  totalAmount: moneyAmountSchema.nullable().optional(),
  currencyCode: currencyCodeSchema,
  /** The transaction where you paid for the shared purchase, if you have recorded it. */
  sourceTransactionId: z.uuid().nullable().optional(),
  participants: z.array(splitParticipantInputSchema).max(200).default([]),
});

export const updateSplitBodySchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).nullable(),
    totalAmount: moneyAmountSchema.nullable(),
    sourceTransactionId: z.uuid().nullable(),
    status: z.enum(SPLIT_STATUSES),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const updateSplitParticipantBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    notes: z.string().trim().max(1000).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const addSplitInstallmentsBodySchema = z.object({
  installments: z.array(splitInstallmentInputSchema).min(1).max(1200),
});

export const updateSplitInstallmentBodySchema = z
  .object({
    dueDate: dateInputSchema,
    expectedAmount: moneyAmountSchema,
    graceUntil: dateInputSchema.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const linkSplitInstallmentBodySchema = z.object({ transactionId: z.uuid() });

export const listSplitsQuerySchema = createListQuerySchema(
  { status: z.enum(SPLIT_STATUSES).optional() },
  ["title", "createdAt"],
);

export type CreateSplitInput = z.input<typeof createSplitBodySchema>;
export type UpdateSplitInput = z.input<typeof updateSplitBodySchema>;
export type UpdateSplitParticipantInput = z.input<typeof updateSplitParticipantBodySchema>;
export type SplitParticipantInput = z.input<typeof splitParticipantInputSchema>;
export type SplitInstallmentInput = z.input<typeof splitInstallmentInputSchema>;
export type AddSplitInstallmentsInput = z.input<typeof addSplitInstallmentsBodySchema>;
export type UpdateSplitInstallmentInput = z.input<typeof updateSplitInstallmentBodySchema>;
export type LinkSplitInstallmentInput = z.input<typeof linkSplitInstallmentBodySchema>;
export type ListSplitsQuery = z.input<typeof listSplitsQuerySchema>;
