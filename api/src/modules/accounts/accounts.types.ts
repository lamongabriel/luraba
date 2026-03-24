import { z } from 'zod';
import { accountsTable } from '@/db/schemas/accounts.schema';

export type Account = typeof accountsTable.$inferSelect;

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  institutionName: z.string().min(1).max(255).optional(),
  institutionDomain: z.string().min(1).max(255).optional(),
  notes: z.string().max(4000).optional(),
  type: z.enum(['checking', 'savings', 'cash', 'wallet']),
  currencyId: z.coerce.number().int().positive(),
});

export type CreateAccountDto = z.infer<typeof createAccountSchema>;