import { z } from "zod";
import { createdByUserIdSchema, wireDateTimeSchema } from "../common.js";
import { splitInstallmentStateSchema, splitStatusSchema } from "./catalog.js";

const wireDateSchema = z.string();

export const splitLinkedTransactionSchema = z.object({
  id: z.uuid(),
  description: z.string(),
  amount: z.number().int(),
  currencyCode: z.string(),
  postedDate: wireDateSchema,
});

export const splitInstallmentSchema = z.object({
  id: z.uuid(),
  participantId: z.uuid(),
  dueDate: wireDateSchema,
  /** The date after which it counts as overdue; equals dueDate when there is no grace period. */
  graceUntil: wireDateSchema.nullable(),
  expectedAmount: z.number().int(),
  state: splitInstallmentStateSchema,
  receivedAt: wireDateTimeSchema.nullable(),
  skippedAt: wireDateTimeSchema.nullable(),
  writtenOffAt: wireDateTimeSchema.nullable(),
  transaction: splitLinkedTransactionSchema.nullable(),
});

export const splitParticipantTotalsSchema = z.object({
  /** Everything still counted as owed: all installments except skipped ones. */
  owed: z.number().int(),
  /** Actual money received (linked transaction amount, or the expected amount when marked by hand). */
  received: z.number().int(),
  writtenOff: z.number().int(),
  /** Expected amount of installments still waiting, scheduled or overdue. */
  outstanding: z.number().int(),
  installmentCount: z.number().int(),
  receivedCount: z.number().int(),
  overdueCount: z.number().int(),
  nextDueDate: wireDateSchema.nullable(),
});

export const splitParticipantSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  notes: z.string().nullable(),
  totals: splitParticipantTotalsSchema,
  installments: z.array(splitInstallmentSchema),
});

export const splitSummarySchema = z.object({
  participantCount: z.number().int(),
  /** Total expected from everyone. */
  owed: z.number().int(),
  received: z.number().int(),
  writtenOff: z.number().int(),
  outstanding: z.number().int(),
  overdueCount: z.number().int(),
  /** People who still owe something, so "who hasn't paid" is one glance. */
  unpaidParticipantNames: z.array(z.string()),
});

export const splitSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  /** What the shared purchase cost you; informational, shares are set per installment. */
  totalAmount: z.number().int().nullable(),
  currencyCode: z.string(),
  status: splitStatusSchema,
  sourceTransactionId: z.uuid().nullable(),
  summary: splitSummarySchema,
  createdByUserId: createdByUserIdSchema,
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});

export const splitDetailSchema = splitSchema.extend({
  participants: z.array(splitParticipantSchema),
});

export type Split = z.output<typeof splitSchema>;
export type SplitDetail = z.output<typeof splitDetailSchema>;
export type SplitParticipant = z.output<typeof splitParticipantSchema>;
export type SplitInstallment = z.output<typeof splitInstallmentSchema>;
export type SplitSummary = z.output<typeof splitSummarySchema>;
