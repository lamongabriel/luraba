import { z } from 'zod';
import { entriesTable } from '@/db/schemas/entries.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';

export type Transaction = typeof transactionsTable.$inferSelect;
export type Entry = typeof entriesTable.$inferSelect;

const baseCreateTransactionSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer', 'card_purchase']),
  description: z.string().min(1).max(512),
  amount: z.coerce.bigint().positive(),
  currencyId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(['cash', 'debit', 'pix', 'boleto', 'credit_card']).optional(),
  accountId: z.coerce.number().int().positive().optional(),
  toAccountId: z.coerce.number().int().positive().optional(),
  creditCardId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  isExcluded: z.boolean().optional(),
  isOneTimeTransaction: z.boolean().optional(),
  purchaseDate: z.coerce.date(),
  postedDate: z.coerce.date(),
});

export const createTransactionSchema = baseCreateTransactionSchema;

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;