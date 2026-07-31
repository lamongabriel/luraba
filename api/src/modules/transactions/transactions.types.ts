import { z } from 'zod';
import type { entriesTable } from '@/db/schemas/entries.schema';
import type { transactionsTable } from '@/db/schemas/transactions.schema';
import {
  type AccountClassification,
  accountClassificationSchema,
} from '@/shared/validation/accounts';
import { moneyAmountSchema, moneyBalanceSchema } from '@/shared/validation/money';
import { transactionTypeSchema } from '@/shared/validation/transactions';

export type TransactionRecord = typeof transactionsTable.$inferSelect;
export type EntryRecord = typeof entriesTable.$inferSelect;
export type TransactionType = TransactionRecord['type'];

export const transactionTagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
});

const tagIdsSchema = z.array(z.uuid()).max(50).optional();

const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());
const paymentMethodCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.toLowerCase());

const baseFields = {
  description: z.string().min(1).max(512),
  purchaseDate: z.coerce.date(),
  postedDate: z.coerce.date(),
  includeInBudget: z.boolean().optional(),
  tagIds: tagIdsSchema,
};

const categorizedLinkFields = {
  categoryId: z.uuid(),
  merchantId: z.uuid().optional(),
};

const expenseTransactionSchema = z.strictObject({
  type: z.literal('expense'),
  ...baseFields,
  ...categorizedLinkFields,
  amount: moneyAmountSchema,
  currencyCode: currencyCodeSchema,
  accountId: z.uuid(),
  paymentMethodCode: paymentMethodCodeSchema,
});

const incomeTransactionSchema = z.strictObject({
  type: z.literal('income'),
  ...baseFields,
  ...categorizedLinkFields,
  amount: moneyAmountSchema,
  currencyCode: currencyCodeSchema,
  accountId: z.uuid(),
  paymentMethodCode: paymentMethodCodeSchema,
});

const transferTransactionSchema = z.strictObject({
  type: z.literal('transfer'),
  ...baseFields,
  fromAccountId: z.uuid(),
  toAccountId: z.uuid(),
  fromAmount: moneyAmountSchema.optional(),
  toAmount: moneyAmountSchema.optional(),
});

const adjustmentTransactionSchema = z.strictObject({
  type: z.literal('adjustment'),
  ...baseFields,
  balance: moneyBalanceSchema,
  accountId: z.uuid(),
});

export const createTransactionSchema = z
  .discriminatedUnion('type', [
    expenseTransactionSchema,
    incomeTransactionSchema,
    transferTransactionSchema,
    adjustmentTransactionSchema,
  ])
  .superRefine((value, ctx) => {
    if (
      value.type === 'transfer' &&
      value.fromAmount === undefined &&
      value.toAmount === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either fromAmount or toAmount must be provided',
        path: ['fromAmount'],
      });
    }
  });

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

export const UpdateTransactionRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdateTransactionRequestBodySchema = z
  .object({
    description: z.string().min(1).max(512).optional(),
    purchaseDate: z.coerce.date().optional(),
    postedDate: z.coerce.date().optional(),
    includeInBudget: z.boolean().optional(),
    categoryId: z.uuid().optional(),
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
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const DeleteTransactionRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const TransactionResponseSchema = z.object({
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
  paymentMethodScope: z.enum(['system', 'household']).nullable(),
  paymentMethodTranslationKey: z.string().nullable(),
  tags: z.array(transactionTagSchema),
  includeInBudget: z.boolean(),
  purchaseDate: z.string(),
  postedDate: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTransactionResponseSchema = TransactionResponseSchema;
export const UpdateTransactionResponseSchema = TransactionResponseSchema;

export const transactionFeedRowKindSchema = z.enum([
  'transaction',
  'credit_card_installment',
  'credit_card_payment',
]);
export const transactionFeedOriginTypeSchema = z.union([
  transactionTypeSchema,
  z.literal('credit_card_installment'),
  z.literal('credit_card_payment'),
]);

export const TransactionFeedRowSchema = TransactionResponseSchema.extend({
  rowId: z.uuid(),
  rowKind: transactionFeedRowKindSchema,
  originType: transactionFeedOriginTypeSchema,
  excludedFromSpending: z.boolean(),
  creditCardId: z.uuid().nullable(),
  purchaseId: z.uuid().nullable(),
  paymentId: z.uuid().nullable(),
  installmentId: z.uuid().nullable(),
  installmentNumber: z.number().int().nullable(),
  installmentCount: z.number().int().nullable(),
});

export const TransactionListSummarySchema = z.object({
  totalCount: z.number().int(),
  incomeAmount: z.number().int(),
  expenseAmount: z.number().int(),
  transferCount: z.number().int(),
});

export const ListTransactionsResponseSchema = z.array(TransactionFeedRowSchema);

export type TransactionResponse = {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  currencyCode: string;
  toAmount: number | null;
  toCurrencyCode: string | null;
  accountId: string | null;
  accountName: string | null;
  accountClassification: AccountClassification | null;
  toAccountId: string | null;
  toAccountName: string | null;
  toAccountClassification: AccountClassification | null;
  categoryId: string | null;
  merchantId: string | null;
  paymentMethodId: string | null;
  paymentMethodCode: string | null;
  paymentMethodName: string | null;
  paymentMethodScope: 'system' | 'household' | null;
  paymentMethodTranslationKey: string | null;
  tags: Array<z.infer<typeof transactionTagSchema>>;
  includeInBudget: boolean;
  purchaseDate: string;
  postedDate: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TransactionFeedRowKind = z.infer<typeof transactionFeedRowKindSchema>;
export type TransactionFeedOriginType = z.infer<typeof transactionFeedOriginTypeSchema>;
export type TransactionFeedRow = TransactionResponse & {
  rowId: string;
  rowKind: TransactionFeedRowKind;
  originType: TransactionFeedOriginType;
  excludedFromSpending: boolean;
  creditCardId: string | null;
  purchaseId: string | null;
  paymentId: string | null;
  installmentId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
};

export type ListTransactionsResponse = z.infer<typeof ListTransactionsResponseSchema>;
export type TransactionListSummary = z.infer<typeof TransactionListSummarySchema>;
export type UpdateTransactionRequestParams = z.infer<typeof UpdateTransactionRequestParamsSchema>;
export type UpdateTransactionRequestBody = z.infer<typeof UpdateTransactionRequestBodySchema>;
export type DeleteTransactionRequestParams = z.infer<typeof DeleteTransactionRequestParamsSchema>;
