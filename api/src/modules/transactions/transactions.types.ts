import { z } from 'zod';
import { entriesTable } from '@/db/schemas/entries.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';

export type Transaction = typeof transactionsTable.$inferSelect;
export type Entry = typeof entriesTable.$inferSelect;
export type TransactionListItem = Transaction & {
  amount: bigint;
  currencyId: string;
};

const baseFields = {
  description: z.string().min(1).max(512),
  purchaseDate: z.coerce.date(),
  postedDate: z.coerce.date(),
  isExcluded: z.boolean().optional(),
  isOneTimeTransaction: z.boolean().optional(),
};

const monetaryFields = {
  amount: z.coerce.bigint().positive(),
  currencyId: z.string().uuid(),
};

const optionalLinkFields = {
  categoryId: z.string().uuid().optional(),
  merchantId: z.string().uuid().optional(),
};

const nonCardPaymentMethodSchema = z.enum(['cash', 'debit', 'pix', 'boleto']);

const expenseTransactionSchema = z.object({
  type: z.literal('expense'),
  ...baseFields,
  ...monetaryFields,
  ...optionalLinkFields,
  accountId: z.string().uuid(),
  paymentMethod: nonCardPaymentMethodSchema,
});

const incomeTransactionSchema = z.object({
  type: z.literal('income'),
  ...baseFields,
  ...monetaryFields,
  ...optionalLinkFields,
  accountId: z.string().uuid(),
  paymentMethod: nonCardPaymentMethodSchema.optional(),
});

const transferTransactionSchema = z.object({
  type: z.literal('transfer'),
  ...baseFields,
  ...monetaryFields,
  accountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  paymentMethod: nonCardPaymentMethodSchema.optional(),
});

const cardPurchaseTransactionSchema = z.object({
  type: z.literal('card_purchase'),
  ...baseFields,
  ...monetaryFields,
  ...optionalLinkFields,
  creditCardId: z.string().uuid(),
  paymentMethod: z.literal('credit_card'),
});

const installmentTransactionSchema = z.object({
  type: z.literal('installment'),
  ...baseFields,
  ...monetaryFields,
  ...optionalLinkFields,
  creditCardId: z.string().uuid(),
  installmentCount: z.coerce.number().int().min(2).max(240),
  paymentMethod: z.literal('credit_card'),
});

const cardPaymentTransactionSchema = z.object({
  type: z.literal('card_payment'),
  description: z.string().min(1).max(512).optional(),
  purchaseDate: z.coerce.date(),
  postedDate: z.coerce.date(),
  accountId: z.string().uuid(),
  billingCycleId: z.string().uuid(),
  paymentMethod: nonCardPaymentMethodSchema.optional(),
  isExcluded: z.boolean().optional(),
  isOneTimeTransaction: z.boolean().optional(),
});

const adjustmentTransactionSchema = z.object({
  type: z.literal('adjustment'),
  ...baseFields,
  amount: z.coerce.bigint().positive(),
  targetType: z.enum(['account', 'credit_card']),
  targetId: z.string().uuid(),
  direction: z.enum(['increase', 'decrease']),
});

export const createTransactionSchema = z.discriminatedUnion('type', [
  expenseTransactionSchema,
  incomeTransactionSchema,
  transferTransactionSchema,
  cardPurchaseTransactionSchema,
  installmentTransactionSchema,
  cardPaymentTransactionSchema,
  adjustmentTransactionSchema,
]);

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
