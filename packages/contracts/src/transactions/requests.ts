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
import { transactionFeedOriginTypeSchema } from "./resource.js";

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
const expenseSchema = z.strictObject({
  type: z.literal("expense"),
  ...baseFields,
  ...categorizedLinkFields,
  amount: moneyAmountSchema,
  currencyCode: currencyCodeSchema,
  accountId: z.uuid(),
  paymentMethodCode: paymentMethodCodeSchema,
});
const incomeSchema = z.strictObject({
  type: z.literal("income"),
  ...baseFields,
  ...categorizedLinkFields,
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
export const createTransactionInputSchema = z
  .discriminatedUnion("type", [expenseSchema, incomeSchema, transferSchema, adjustmentSchema])
  .superRefine((value, ctx) => {
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
