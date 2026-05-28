import { z } from 'zod';
import { merchantsTable } from '@/db/schemas/merchants.schema';

export type MerchantRecord = typeof merchantsTable.$inferSelect;

export const merchantSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  logoUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CreateMerchantRequestBodySchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255).optional(),
});

export const CreateMerchantResponseSchema = merchantSchema;

export const ListMerchantsResponseSchema = z.array(merchantSchema);

export type Merchant = z.infer<typeof merchantSchema>;
export type CreateMerchantRequestBody = z.infer<typeof CreateMerchantRequestBodySchema>;
export type CreateMerchantResponse = z.infer<typeof CreateMerchantResponseSchema>;
export type ListMerchantsResponse = z.infer<typeof ListMerchantsResponseSchema>;
