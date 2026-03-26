import { z } from 'zod';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';

export type TransactionRecord = typeof transactionsTable.$inferSelect;
export type EntryRecord = typeof entriesTable.$inferSelect;
export type AccountClassification = typeof accountsTable.$inferSelect['classification'];
export type TransactionType = TransactionRecord['type'];

const currencyCodeSchema = z.string().trim().length(3).transform((value) => value.toUpperCase());
const paymentMethodCodeSchema = z.string().trim().min(1).max(32).transform((value) => value.toLowerCase());

const baseFields = {
  description: z.string().min(1).max(512),
  purchaseDate: z.coerce.date(),
  postedDate: z.coerce.date(),
  isExcluded: z.boolean().optional(),
  isOneTimeTransaction: z.boolean().optional(),
};

const optionalLinkFields = {
  categoryId: z.string().uuid().optional(),
  merchantId: z.string().uuid().optional(),
};

const expenseTransactionSchema = z.object({
  type: z.literal('expense'),
  ...baseFields,
  ...optionalLinkFields,
  amount: z.coerce.bigint().positive(),
  currencyCode: currencyCodeSchema,
  accountId: z.string().uuid(),
  paymentMethodCode: paymentMethodCodeSchema,
});

const incomeTransactionSchema = z.object({
  type: z.literal('income'),
  ...baseFields,
  ...optionalLinkFields,
  amount: z.coerce.bigint().positive(),
  currencyCode: currencyCodeSchema,
  accountId: z.string().uuid(),
  paymentMethodCode: paymentMethodCodeSchema,
});

const transferTransactionSchema = z.object({
  type: z.literal('transfer'),
  ...baseFields,
  amount: z.coerce.bigint().positive(),
  currencyCode: currencyCodeSchema,
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
});

const adjustmentTransactionSchema = z.object({
  type: z.literal('adjustment'),
  ...baseFields,
  amount: z.coerce.bigint().positive(),
  accountId: z.string().uuid(),
  direction: z.enum(['increase', 'decrease']),
});

export const createTransactionSchema = z.discriminatedUnion('type', [
  expenseTransactionSchema,
  incomeTransactionSchema,
  transferTransactionSchema,
  adjustmentTransactionSchema,
]);

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

export type TransactionResponse = {
  id: string;
  userId: string;
  type: TransactionType;
  description: string;
  amount: bigint;
  currencyCode: string;
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
  isExcluded: boolean;
  isOneTimeTransaction: boolean;
  purchaseDate: string;
  postedDate: string;
  createdAt: Date;
  updatedAt: Date;
};
