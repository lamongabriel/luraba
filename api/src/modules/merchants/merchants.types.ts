import { z } from 'zod';
import { merchantsTable } from '@/db/schemas/merchants.schema';

export type Merchant = typeof merchantsTable.$inferSelect;

export const createMerchantSchema = z.object({
  name: z.string().min(1).max(255),
  website: z.string().max(255).optional(),
  logoUrl: z.string().max(512).optional(),
});

export type CreateMerchantDto = z.infer<typeof createMerchantSchema>;