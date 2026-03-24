import { z } from 'zod';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';

export type CreditCard = typeof creditCardsTable.$inferSelect;

export const createCreditCardSchema = z.object({
  accountId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(255),
  brand: z.string().min(1).max(64),
  last4: z.string().regex(/^\d{4}$/),
  limitAmount: z.coerce.bigint().positive(),
  currencyId: z.coerce.number().int().positive(),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  graceDays: z.coerce.number().int().min(0).max(90).default(0),
});

export const cardIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateCreditCardDto = z.infer<typeof createCreditCardSchema>;