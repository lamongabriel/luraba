import { z } from "zod";
import {
  currencyCodeSchema,
  dateInputSchema,
  idParamsSchema,
  moneyAmountSchema,
  moneyBalanceSchema,
} from "../common.js";
import {
  baseListQuerySchema,
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  dateQuerySchema,
  validateRange,
} from "../list.js";
import { refundReasonSchema, transactionFeedOriginTypeSchema } from "./resource.js";

const tagIdsSchema = z.array(z.uuid()).max(50).optional();
const paymentMethodCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.toLowerCase());
const baseFields = {
  description: z.string().min(1).max(512),
  purchaseDate: dateInputSchema,
  postedDate: dateInputSchema,
  includeInBudget: z.boolean().optional(),
  tagIds: tagIdsSchema,
};
const categorizedLinkFields = {
  categoryId: z.uuid().nullable().optional(),
  merchantId: z.uuid().optional(),
};
/** `YYYY-MM`: the month the money belongs to when that differs from the posted month. */
const competencyMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const expenseSchema = z.strictObject({
  type: z.literal("expense"),
  ...baseFields,
  ...categorizedLinkFields,
  competencyMonth: competencyMonthSchema.optional(),
  amount: moneyAmountSchema,
  currencyCode: currencyCodeSchema,
  accountId: z.uuid(),
  paymentMethodCode: paymentMethodCodeSchema,
});
const incomeSchema = z.strictObject({
  type: z.literal("income"),
  ...baseFields,
  ...categorizedLinkFields,
  /** When omitted, plan reports apply the rule: salary received late in the month counts for the next month. */
  competencyMonth: competencyMonthSchema.optional(),
  amount: moneyAmountSchema,
  currencyCode: currencyCodeSchema,
  accountId: z.uuid(),
  paymentMethodCode: paymentMethodCodeSchema,
});
const transferSchema = z.strictObject({
  type: z.literal("transfer"),
  ...baseFields,
  fromAccountId: z.uuid(),
  toAccountId: z.uuid(),
  fromAmount: moneyAmountSchema.optional(),
  toAmount: moneyAmountSchema.optional(),
});
const adjustmentSchema = z.strictObject({
  type: z.literal("adjustment"),
  ...baseFields,
  balance: moneyBalanceSchema,
  accountId: z.uuid(),
});
/**
 * Money that comes back without a source account: set `accountId` (it raises the balance) or
 * `creditCardId` (it lowers the open invoice). With `originalTransactionId` the category defaults to
 * the original's. Reports net it against the category; it is never income.
 */
const refundSchema = z.strictObject({
  type: z.literal("refund"),
  ...baseFields,
  ...categorizedLinkFields,
  amount: moneyAmountSchema,
  currencyCode: currencyCodeSchema.optional(),
  reason: refundReasonSchema,
  accountId: z.uuid().optional(),
  creditCardId: z.uuid().optional(),
  originalTransactionId: z.uuid().optional(),
});
export const createTransactionInputSchema = z
  .discriminatedUnion("type", [
    expenseSchema,
    incomeSchema,
    transferSchema,
    adjustmentSchema,
    refundSchema,
  ])
  .superRefine((value, ctx) => {
    if (value.type === "refund" && Boolean(value.accountId) === Boolean(value.creditCardId))
      ctx.addIssue({
        code: "custom",
        message: "Provide either accountId or creditCardId",
        path: ["accountId"],
      });
    if (value.type === "transfer" && value.fromAmount === undefined && value.toAmount === undefined)
      ctx.addIssue({
        code: "custom",
        message: "Either fromAmount or toAmount must be provided",
        path: ["fromAmount"],
      });
  });
export const updateTransactionInputSchema = z
  .object({
    description: z.string().min(1).max(512).optional(),
    purchaseDate: dateInputSchema.optional(),
    postedDate: dateInputSchema.optional(),
    includeInBudget: z.boolean().optional(),
    competencyMonth: competencyMonthSchema.nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    merchantId: z.uuid().nullable().optional(),
    paymentMethodCode: paymentMethodCodeSchema.optional(),
    amount: moneyAmountSchema.optional(),
    currencyCode: currencyCodeSchema.optional(),
    accountId: z.uuid().optional(),
    fromAccountId: z.uuid().optional(),
    toAccountId: z.uuid().optional(),
    fromAmount: moneyAmountSchema.optional(),
    toAmount: moneyAmountSchema.optional(),
    tagIds: tagIdsSchema,
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

const commonFilterShape = {
  dateFrom: dateQuerySchema.optional(),
  dateTo: dateQuerySchema.optional(),
  purchaseDateFrom: dateQuerySchema.optional(),
  purchaseDateTo: dateQuerySchema.optional(),
  originTypes: commaSeparatedArraySchema(transactionFeedOriginTypeSchema),
  categoryIds: commaSeparatedArraySchema(z.uuid()),
  uncategorized: booleanQuerySchema.optional(),
  merchantIds: commaSeparatedArraySchema(z.uuid()),
  /** Only rows created by these household members ("who spent it"). */
  createdByUserIds: commaSeparatedArraySchema(z.uuid()),
  tagIds: commaSeparatedArraySchema(z.uuid()),
  paymentMethodCodes: commaSeparatedArraySchema(paymentMethodCodeSchema),
  currencyCodes: commaSeparatedArraySchema(currencyCodeSchema),
  amountMin: z.coerce.number().int().min(0).optional(),
  amountMax: z.coerce.number().int().min(0).optional(),
  includeInBudget: booleanQuerySchema.optional(),
} as const;
const allFilterShape = {
  ...commonFilterShape,
  accountIds: commaSeparatedArraySchema(z.uuid()),
  creditCardIds: commaSeparatedArraySchema(z.uuid()),
  /** Only credit card installments on these invoices (billing cycles). */
  billingCycleIds: commaSeparatedArraySchema(z.uuid()).optional(),
} as const;
const sortFields = [
  "amount",
  "createdAt",
  "description",
  "originType",
  "postedDate",
  "purchaseDate",
] as const;
function validateRanges(query: Record<string, unknown>, ctx: z.RefinementCtx) {
  validateRange(query, ctx, "dateFrom", "dateTo");
  validateRange(query, ctx, "purchaseDateFrom", "purchaseDateTo");
  validateRange(query, ctx, "amountMin", "amountMax");
}
export const listTransactionsQuerySchema = createListQuerySchema(
  allFilterShape,
  sortFields,
).superRefine(validateRanges);
export const transactionAnalyticsQuerySchema = baseListQuerySchema
  .pick({ search: true })
  .extend(allFilterShape)
  .strict()
  .superRefine(validateRanges);
export const listAccountTransactionsQuerySchema = createListQuerySchema(
  commonFilterShape,
  sortFields,
).superRefine(validateRanges);
export const upcomingTransactionsQuerySchema = transactionAnalyticsQuerySchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.literal("effectiveDate").default("effectiveDate"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});
export const transactionIdParamsSchema = idParamsSchema;

export type CreateTransactionInput = z.input<typeof createTransactionInputSchema>;
export type UpdateTransactionInput = z.input<typeof updateTransactionInputSchema>;
export type ListTransactionsQuery = z.input<typeof listTransactionsQuerySchema>;
export type TransactionAnalyticsQuery = z.input<typeof transactionAnalyticsQuerySchema>;
export type UpcomingTransactionsQuery = z.input<typeof upcomingTransactionsQuerySchema>;
export type ListAccountTransactionsQuery = z.input<typeof listAccountTransactionsQuerySchema>;
export type TransactionSortField =
  | "amount"
  | "createdAt"
  | "description"
  | "originType"
  | "postedDate"
  | "purchaseDate";

export const transactionItemInputSchema = z.object({
  /** A product from the catalog. Without it the item is free text. */
  productId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(255),
  quantity: z.number().int().min(1).max(10_000).default(1),
  unitPrice: moneyAmountSchema,
  /**
   * Remember this price on the product (creating the product from `name` when there is no
   * `productId`), so the catalog follows what was actually paid.
   */
  saveAsProductPrice: z.boolean().default(false),
});
/** Replaces the whole list of items of a transaction; an empty list removes them. */
export const replaceTransactionItemsBodySchema = z.object({
  items: z.array(transactionItemInputSchema).max(200),
});
export type ReplaceTransactionItemsInput = z.input<typeof replaceTransactionItemsBodySchema>;
