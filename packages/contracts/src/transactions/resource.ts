import { z } from "zod";
import { accountClassificationSchema } from "../accounts/values.js";
import { createdByUserIdSchema, currencyCodeSchema, wireDateTimeSchema } from "../common.js";
import { tagSummarySchema } from "../tags/resource.js";

export const transactionTypeSchema = z.enum([
  "expense",
  "income",
  "transfer",
  "adjustment",
  "refund",
]);
/** Why money came back: a refund, a cancelled order, a chargeback, cashback or a friend paying their share. */
export const REFUND_REASONS = [
  "refund",
  "cancellation",
  "chargeback",
  "cashback",
  "split",
] as const;
export const refundReasonSchema = z.enum(REFUND_REASONS);
/** Set on `refund` transactions only. A card credit has `creditCardId` and the invoice it lands on. */
export const transactionRefundSchema = z.object({
  reason: refundReasonSchema,
  originalTransactionId: z.uuid().nullable(),
  creditCardId: z.uuid().nullable(),
  billingCycleId: z.uuid().nullable(),
});
export const transactionTagSchema = tagSummarySchema;
/** One money-back row linked to a purchase: where it landed and how much, in the purchase's currency. */
export const moneyBackEntrySchema = z.object({
  transactionId: z.uuid(),
  reason: refundReasonSchema,
  description: z.string(),
  amount: z.number().int(),
  currencyCode: z.string(),
  postedDate: z.string(),
  accountId: z.uuid().nullable(),
  accountName: z.string().nullable(),
  accountClassification: accountClassificationSchema.nullable(),
  creditCardId: z.uuid().nullable(),
});
/**
 * Net cost of an expense or card purchase (minor units, the purchase's currency): `totalAmount` is the full
 * purchase (all installments), `receivedBack` the sum of every linked money-back row and `outOfPocket` the
 * difference. Null on everything that is not an expense or card purchase.
 */
export const transactionMoneyBackSchema = z.object({
  totalAmount: z.number().int(),
  receivedBack: z.number().int(),
  outOfPocket: z.number().int(),
  entries: z.array(moneyBackEntrySchema),
});
export const transactionSchema = z.object({
  id: z.uuid(),
  type: transactionTypeSchema,
  description: z.string(),
  originalDescription: z.string().nullable(),
  notes: z.string().nullable(),
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
  refund: transactionRefundSchema.nullable(),
  moneyBack: transactionMoneyBackSchema.nullable().default(null),
  includeInBudget: z.boolean(),
  purchaseDate: z.string(),
  postedDate: z.string(),
  createdByUserId: createdByUserIdSchema,
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
const categoryBreakdownSchema = z.object({
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
  expenseBreakdown: categoryBreakdownSchema,
  incomeBreakdown: categoryBreakdownSchema,
});
export const upcomingTransactionSourceSchema = z.enum([
  "credit_card_installment",
  "bill_occurrence",
]);
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
  /** Only bills can be past due while still upcoming; installments are always in the future. */
  isOverdue: z.boolean().default(false),
});

export type TransactionMoneyBack = z.output<typeof transactionMoneyBackSchema>;
export type MoneyBackEntry = z.output<typeof moneyBackEntrySchema>;
export type TransactionRefund = z.output<typeof transactionRefundSchema>;
export type RefundReason = z.output<typeof refundReasonSchema>;
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

/** One thing a transaction bought. `name` and `unitPrice` are snapshots; `productId` links the catalog. */
export const transactionItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid().nullable(),
  name: z.string(),
  quantity: z.number().int(),
  /** Unit price in minor units, in the transaction's currency. */
  unitPrice: z.number().int(),
  position: z.number().int(),
  /** The linked product's picture, when it has one. */
  imageUploadId: z.uuid().nullable(),
});
export type TransactionItem = z.output<typeof transactionItemSchema>;
