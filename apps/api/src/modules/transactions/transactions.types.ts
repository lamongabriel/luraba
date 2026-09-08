import type {
  createTransactionInputSchema,
  transactionAnalyticsSchema,
  transactionFeedRowSchema,
  transactionListSummarySchema,
  transactionSchema,
  transactionTagSchema,
  transactionTypeSchema,
  upcomingTransactionSchema,
  updateTransactionInputSchema,
} from "@luraba/contracts/transactions";
import type { z } from "zod";
import type { entriesTable } from "@/db/schemas/entries.schema";
import type { tagsTable } from "@/db/schemas/tags.schema";
import type { transactionsTable } from "@/db/schemas/transactions.schema";

/** Database records stay API-local; public HTTP schemas come from contracts. */
export type TransactionRecord = typeof transactionsTable.$inferSelect;
export type EntryRecord = typeof entriesTable.$inferSelect;
export type TagRecord = typeof tagsTable.$inferSelect;

export type TransactionType = z.output<typeof transactionTypeSchema>;
export type TransactionTag = z.output<typeof transactionTagSchema>;
export type CreateTransactionDto = z.output<typeof createTransactionInputSchema>;
export type UpdateTransactionValues = z.output<typeof updateTransactionInputSchema>;

// API services may still hold native Date values until the controller parses the
// response at the HTTP boundary, so these use schema inputs rather than outputs.
export type TransactionResponse = z.input<typeof transactionSchema>;
export type TransactionFeedRowKind = z.output<typeof transactionFeedRowSchema>["rowKind"];
export type TransactionFeedOriginType = z.output<typeof transactionFeedRowSchema>["originType"];
export type TransactionFeedRow = z.input<typeof transactionFeedRowSchema>;
export type ListTransactionsResponse = TransactionFeedRow[];
export type TransactionListSummary = z.input<typeof transactionListSummarySchema>;
export type TransactionAnalyticsResponse = z.output<typeof transactionAnalyticsSchema>;
export type UpcomingTransaction = z.output<typeof upcomingTransactionSchema>;
