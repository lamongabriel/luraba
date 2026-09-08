import { z } from "zod";
import { accountClassificationSchema } from "../accounts/values.js";
import { currencyCodeSchema, wireDateTimeSchema } from "../common.js";
import { tagSummarySchema } from "../tags/resource.js";

export const transactionTypeSchema = z.enum(["expense", "income", "transfer", "adjustment"]);
export const transactionTagSchema = tagSummarySchema;
export const transactionSchema = z.object({
  id: z.uuid(),
  type: transactionTypeSchema,
  description: z.string(),
  amount: z.number().int(),
  currencyCode: z.string(),
  toAmount: z.number().int().nullable(),
  toCurrencyCode: z.string().nullable(),
  accountId: z.uuid().nullable(),
  accountName: z.string().nullable(),
  accountClassification: accountClassificationSchema.nullable(),
  toAccountId: z.uuid().nullable(),
  toAccountName: z.string().nullable(),
  toAccountClassification: accountClassificationSchema.nullable(),
  categoryId: z.uuid().nullable(),
  merchantId: z.uuid().nullable(),
  paymentMethodId: z.uuid().nullable(),
  paymentMethodCode: z.string().nullable(),
  paymentMethodName: z.string().nullable(),
  paymentMethodScope: z.enum(["system", "household"]).nullable(),
  paymentMethodTranslationKey: z.string().nullable(),
  tags: z.array(transactionTagSchema),
  includeInBudget: z.boolean(),
  purchaseDate: z.string(),
  postedDate: z.string(),
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});
export const transactionFeedRowKindSchema = z.enum([
  "transaction",
  "credit_card_installment",
  "credit_card_payment",
]);
export const transactionFeedOriginTypeSchema = z.union([
  transactionTypeSchema,
  z.literal("credit_card_installment"),
  z.literal("credit_card_payment"),
]);
export const transactionFeedRowSchema = transactionSchema.extend({
  rowId: z.uuid(),
  rowKind: transactionFeedRowKindSchema,
  originType: transactionFeedOriginTypeSchema,
  creditCardId: z.uuid().nullable(),
  purchaseId: z.uuid().nullable(),
  paymentId: z.uuid().nullable(),
  installmentId: z.uuid().nullable(),
  installmentNumber: z.number().int().nullable(),
  installmentCount: z.number().int().nullable(),
});
export const transactionListSummarySchema = z.object({
  totalCount: z.number().int(),
  incomeAmount: z.number().int(),
  expenseAmount: z.number().int(),
  transferCount: z.number().int(),
});
const analyticsMetricSchema = z.object({
  value: z.number().int(),
  previousValue: z.number().int().nullable(),
  changePercent: z.number().nullable(),
  trend: z.array(z.object({ date: z.string(), value: z.number().int() })),
});
export const transactionAnalyticsSchema = z.object({
  currencyCode: currencyCodeSchema,
  dateFrom: z.string().nullable(),
  dateTo: z.string().nullable(),
  metrics: z.object({
    moneyIn: analyticsMetricSchema,
    moneyOut: analyticsMetricSchema,
    net: analyticsMetricSchema,
  }),
  expenseBreakdown: z.object({
    items: z.array(
      z.object({
        id: z.uuid().nullable(),
        name: z.string(),
        icon: z.string().nullable(),
        color: z.string().nullable(),
        amount: z.number().int(),
        percentage: z.number(),
      }),
    ),
  }),
});
export const upcomingTransactionSourceSchema = z.literal("credit_card_installment");
export const upcomingTransactionSchema = z.object({
  sourceType: upcomingTransactionSourceSchema,
  sourceId: z.uuid(),
  parentId: z.uuid(),
  description: z.string(),
  effectiveDate: z.string(),
  amount: z.number().int(),
  currencyCode: currencyCodeSchema,
  accountId: z.uuid().nullable(),
  accountName: z.string().nullable(),
  creditCardId: z.uuid().nullable(),
  creditCardName: z.string().nullable(),
  categoryId: z.uuid().nullable(),
  categoryName: z.string().nullable(),
  merchantId: z.uuid().nullable(),
  merchantName: z.string().nullable(),
  installmentNumber: z.number().int().nullable(),
  installmentCount: z.number().int().nullable(),
});

export type Transaction = z.output<typeof transactionSchema>;
export type TransactionFeedRow = z.output<typeof transactionFeedRowSchema>;
export type TransactionListSummary = z.output<typeof transactionListSummarySchema>;
export type TransactionAnalytics = z.output<typeof transactionAnalyticsSchema>;
export type UpcomingTransaction = z.output<typeof upcomingTransactionSchema>;
export type TransactionType = z.output<typeof transactionTypeSchema>;
export type TransactionTag = z.output<typeof transactionTagSchema>;
export type TransactionFeedRowKind = z.output<typeof transactionFeedRowKindSchema>;
export type TransactionFeedOriginType = z.output<typeof transactionFeedOriginTypeSchema>;
export type TransactionAnalyticsMetric = TransactionAnalytics["metrics"]["moneyIn"];
export type TransactionExpenseBreakdownItem =
  TransactionAnalytics["expenseBreakdown"]["items"][number];
export type UpcomingTransactionSourceType = z.output<typeof upcomingTransactionSourceSchema>;
