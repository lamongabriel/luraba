import { z } from 'zod';

export const creditCardCycleDisplayStatusSchema = z.enum([
  'current',
  'upcoming',
  'due',
  'overdue',
  'paid',
]);

export const creditCardCycleScopeSchema = z.enum(['default', 'all']);

export type CreditCardCycleDisplayStatus = z.infer<typeof creditCardCycleDisplayStatusSchema>;
export type CreditCardCycleScope = z.infer<typeof creditCardCycleScopeSchema>;
