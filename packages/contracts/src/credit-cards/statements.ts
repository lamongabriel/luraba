import { z } from "zod";
import { moneyAmountSchema, wireDateTimeSchema } from "../common.js";
import { creditCardCycleSchema } from "./resource.js";

/** Issuers whose invoice files can be read. PDF is not supported (no reliable text extraction); export CSV or OFX. */
export const STATEMENT_ISSUERS = ["nubank", "inter", "xp", "inter_global", "ofx"] as const;
export const statementIssuerSchema = z.enum(STATEMENT_ISSUERS);
export const statementMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must use YYYY-MM");

/** The most text a statement may have (5 MB of characters). */
const MAX_STATEMENT_CHARS = 5_000_000;

/**
 * An issuer statement for one invoice. `month` is the month the invoice is due in (the one the overview shows). The
 * file is sent as text so a preview and the apply can run on the same content.
 */
export const cardStatementInputSchema = z.object({
  fileName: z.string().min(1).max(255),
  content: z.string().min(1).max(MAX_STATEMENT_CHARS),
  month: statementMonthSchema,
  /** Leave out to detect the layout from the file. */
  issuer: statementIssuerSchema.optional(),
  /** Overrides the total read from the file (minor units), e.g. the closed total shown on the issuer's app. */
  issuerTotal: moneyAmountSchema.optional(),
});

export const statementLineStatusSchema = z.enum([
  "matched",
  "corrected",
  "review",
  "missing",
  "netted",
  "payment",
]);
export const statementLineKindSchema = z.enum(["purchase", "iof", "fee", "credit"]);

export const cardStatementLineSchema = z.object({
  index: z.number().int(),
  date: z.iso.date().nullable(),
  description: z.string(),
  /** Minor units; negative is a credit. */
  amount: z.number().int(),
  kind: statementLineKindSchema,
  installment: z.object({ number: z.number().int(), total: z.number().int() }).nullable(),
  status: statementLineStatusSchema,
  /** Statement amount minus Luraba's, for matched, corrected and review lines. */
  difference: z.number().int().nullable(),
  installmentId: z.uuid().nullable(),
  purchaseId: z.uuid().nullable(),
  /** The Luraba description of the matched purchase. */
  purchaseDescription: z.string().nullable(),
  /** Luraba's amount before any correction. */
  lurabaAmount: z.number().int().nullable(),
});

export const cardStatementExtraSchema = z.object({
  installmentId: z.uuid(),
  purchaseId: z.uuid(),
  description: z.string(),
  installmentNumber: z.number().int(),
  installmentCount: z.number().int(),
  amount: z.number().int(),
});

export const cardStatementSummarySchema = z.object({
  matched: z.number().int(),
  corrected: z.number().int(),
  review: z.number().int(),
  missing: z.number().int(),
  extra: z.number().int(),
});

export const cardStatementResultSchema = z.object({
  /** True for a preview (nothing written) and false after an apply. */
  dryRun: z.boolean(),
  issuer: statementIssuerSchema,
  month: statementMonthSchema,
  billingCycleId: z.uuid(),
  closingDate: z.iso.date(),
  dueDate: z.iso.date(),
  issuerTotal: z.number().int(),
  /** The invoice total before the corrections. */
  lurabaTotalBefore: z.number().int(),
  /** The invoice total after the corrections (what it would be on a preview). */
  lurabaTotalAfter: z.number().int(),
  /** `lurabaTotalAfter - issuerTotal`; zero means the invoice matches the issuer. */
  remainingDifference: z.number().int(),
  /** The invoice is (or, on a preview, would be) reconciled and locked. */
  reconciled: z.boolean(),
  summary: cardStatementSummarySchema,
  lines: z.array(cardStatementLineSchema),
  /** Luraba installments on the invoice that the statement does not show ("not on statement"). */
  extra: z.array(cardStatementExtraSchema),
  warnings: z.array(z.string()),
  /** The saved import, after an apply. */
  importId: z.uuid().nullable(),
});

export const cardStatementImportSchema = z.object({
  id: z.uuid(),
  billingCycleId: z.uuid(),
  issuer: statementIssuerSchema,
  fileName: z.string(),
  issuerTotal: z.number().int(),
  summary: cardStatementSummarySchema,
  reconciled: z.boolean(),
  createdAt: wireDateTimeSchema,
});

export const reconcileCycleInputSchema = z.object({
  month: statementMonthSchema,
  /** The issuer's closed invoice total in minor units. */
  issuerTotal: moneyAmountSchema,
});

export const reconcileCycleResultSchema = z.object({
  /** True when the invoice total equals the issuer total; the invoice is then locked. */
  reconciled: z.boolean(),
  issuerTotal: z.number().int(),
  statementAmount: z.number().int(),
  /** `statementAmount - issuerTotal`. */
  difference: z.number().int(),
  cycle: creditCardCycleSchema,
});

export const installmentAuditSchema = z.object({
  id: z.uuid(),
  purchaseId: z.uuid(),
  installmentId: z.uuid().nullable(),
  billingCycleId: z.uuid().nullable(),
  installmentNumber: z.number().int(),
  previousAmount: z.number().int(),
  newAmount: z.number().int(),
  source: z.enum(["statement", "override", "manual"]),
  statementImportId: z.uuid().nullable(),
  note: z.string(),
  createdAt: wireDateTimeSchema,
});

export const installmentAuditsQuerySchema = z.object({
  purchaseId: z.uuid().optional(),
  billingCycleId: z.uuid().optional(),
});

export const roundingPatternSchema = z.object({
  /** `none` means every installment is rounded down and the cents are dropped. */
  pattern: z.enum(["first", "last", "middle", "none"]),
  /** What new purchases use by default; null when the pattern cannot be reproduced (`middle`). */
  roundingMode: z
    .enum(["remainder_last", "remainder_first", "round_up_all", "round_down_all"])
    .nullable(),
  samples: z.number().int(),
});

export const cardRoundingPatternsSchema = z.object({
  /** The pattern for the whole card, learned from reconciled purchases. */
  card: roundingPatternSchema.nullable(),
  merchants: z.array(roundingPatternSchema.extend({ merchantId: z.uuid() })),
});

export type CardStatementInput = z.input<typeof cardStatementInputSchema>;
export type CardStatementResult = z.output<typeof cardStatementResultSchema>;
export type CardStatementLine = z.output<typeof cardStatementLineSchema>;
export type CardStatementImport = z.output<typeof cardStatementImportSchema>;
export type ReconcileCycleInput = z.input<typeof reconcileCycleInputSchema>;
export type ReconcileCycleResult = z.output<typeof reconcileCycleResultSchema>;
export type InstallmentAudit = z.output<typeof installmentAuditSchema>;
export type CardRoundingPatterns = z.output<typeof cardRoundingPatternsSchema>;
