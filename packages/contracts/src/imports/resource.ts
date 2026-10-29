import { z } from "zod";

export const importSourceKindSchema = z.enum(["bank_account", "credit_card"]);
export const importBatchStatusSchema = z.enum([
  "draft",
  "queued",
  "importing",
  "completed",
  "failed",
]);
export const importRowKindSchema = z.enum([
  "expense",
  "income",
  "transfer",
  "card_purchase",
  "card_payment",
  "unsupported",
]);
/** Derived state of a row, shown as a badge. */
export const importRowStatusSchema = z.enum([
  "ready",
  "invalid",
  "duplicate",
  "skipped",
  "created",
  "failed",
]);
export const importRowOutcomeSchema = z.enum(["created", "duplicate", "skipped", "failed"]);
export const importMappingTargetTypeSchema = z.enum(["merchant", "account", "credit_card", "none"]);
export const importIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string(),
});

export const importParserSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  sourceKind: importSourceKindSchema.nullable(),
  extensions: z.array(z.string()),
});

export const importMappingSchema = z.object({
  targetType: importMappingTargetTypeSchema,
  merchantId: z.uuid().nullable(),
  accountId: z.uuid().nullable(),
  creditCardId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  tagIds: z.array(z.uuid()),
});

export const importBatchSummarySchema = z.object({
  ready: z.number().int(),
  invalid: z.number().int(),
  duplicates: z.number().int(),
  skipped: z.number().int(),
  warnings: z.number().int(),
});

export const importBatchSchema = z.object({
  id: z.uuid(),
  status: importBatchStatusSchema,
  parserId: z.string(),
  parserLabel: z.string(),
  sourceKind: importSourceKindSchema,
  fileName: z.string(),
  fileSize: z.number().int(),
  institution: z.string().nullable(),
  sourceAccountRef: z.string().nullable(),
  currencyCode: z.string().nullable(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  statementBalance: z.number().int().nullable(),
  statementBalanceDate: z.string().nullable(),
  warnings: z.array(z.string()),
  targetAccountId: z.uuid().nullable(),
  targetCreditCardId: z.uuid().nullable(),
  /** The target used the last time a file with the same account reference was imported. */
  suggestedTarget: z.object({ type: z.enum(["account", "credit_card"]), id: z.uuid() }).nullable(),
  rowCount: z.number().int(),
  processedCount: z.number().int(),
  createdCount: z.number().int(),
  duplicateCount: z.number().int(),
  skippedCount: z.number().int(),
  failedCount: z.number().int(),
  errorMessage: z.string().nullable(),
  summary: importBatchSummarySchema,
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const importRowSchema = z.object({
  id: z.uuid(),
  rowIndex: z.number().int(),
  postedDate: z.string().nullable(),
  amount: z.number().int().nullable(),
  description: z.string(),
  counterparty: z.string().nullable(),
  sourceKey: z.string(),
  externalId: z.string().nullable(),
  installmentNumber: z.number().int().nullable(),
  installmentTotal: z.number().int().nullable(),
  balanceAfter: z.number().int().nullable(),
  /** Row level overrides. Null means "follow the mapping of the source key". */
  merchantId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  tagIds: z.array(z.uuid()).nullable(),
  descriptionOverride: z.string().nullable(),
  skip: z.boolean(),
  /** What the mapping and overrides resolve to. */
  effective: importMappingSchema,
  kind: importRowKindSchema.nullable(),
  status: importRowStatusSchema,
  issues: z.array(importIssueSchema),
  outcome: importRowOutcomeSchema.nullable(),
  outcomeMessage: z.string().nullable(),
});

export const importGroupSchema = z.object({
  sourceKey: z.string(),
  displayName: z.string(),
  sampleDescription: z.string(),
  rowCount: z.number().int(),
  /** Sum of the signed amounts of the group's rows. */
  totalAmount: z.number().int(),
  /** What the adapter thinks this is, in English (for example "Looks like a card payment"). */
  hint: z.string().nullable(),
  mapping: importMappingSchema.nullable(),
  issueCount: z.number().int(),
});

export const importReconciliationSchema = z.object({
  batchId: z.uuid(),
  currencyCode: z.string().nullable(),
  targetName: z.string().nullable(),
  statement: z.object({
    periodStart: z.string().nullable(),
    periodEnd: z.string().nullable(),
    balance: z.number().int().nullable(),
    balanceDate: z.string().nullable(),
    rowCount: z.number().int(),
    totalIn: z.number().int(),
    totalOut: z.number().int(),
    /** Balance before the period, worked out as closing balance minus the file's net movement. */
    impliedOpeningBalance: z.number().int().nullable(),
  }),
  luraba: z.object({
    /** Balance of the target in Luraba as of the statement date (for cards: used credit). */
    balance: z.number().int().nullable(),
    /** Balance of the target in Luraba the day before the period starts. */
    openingBalance: z.number().int().nullable(),
    rowCount: z.number().int(),
    totalIn: z.number().int(),
    totalOut: z.number().int(),
  }),
  /** Implied opening balance minus Luraba's: a non-zero value means history is missing before the period. */
  openingDifference: z.number().int().nullable(),
  balanceDifference: z.number().int().nullable(),
  matches: z.boolean().nullable(),
  /** Statement rows with no Luraba counterpart, and Luraba rows not found in the file. */
  missingInLuraba: z.number().int(),
  missingInStatement: z.array(
    z.object({
      transactionId: z.uuid(),
      date: z.string(),
      amount: z.number().int(),
      description: z.string(),
    }),
  ),
  notes: z.array(z.string()),
});

export type ImportParser = z.output<typeof importParserSchema>;
export type ImportBatch = z.output<typeof importBatchSchema>;
export type ImportRow = z.output<typeof importRowSchema>;
export type ImportGroup = z.output<typeof importGroupSchema>;
export type ImportMapping = z.output<typeof importMappingSchema>;
export type ImportIssue = z.output<typeof importIssueSchema>;
export type ImportReconciliation = z.output<typeof importReconciliationSchema>;
export type ImportRowKind = z.output<typeof importRowKindSchema>;
export type ImportRowStatus = z.output<typeof importRowStatusSchema>;
export type ImportSourceKind = z.output<typeof importSourceKindSchema>;
export type ImportBatchStatus = z.output<typeof importBatchStatusSchema>;
export type ImportMappingTargetType = z.output<typeof importMappingTargetTypeSchema>;
