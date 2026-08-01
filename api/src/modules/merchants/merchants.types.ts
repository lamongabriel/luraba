import { z } from 'zod';
import type { merchantsTable } from '@/db/schemas/merchants.schema';
import { institutionDomainInputSchema } from '@/shared/validation/domain';

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
  domain: institutionDomainInputSchema.optional(),
});

export const CreateMerchantResponseSchema = merchantSchema;

export const ListMerchantsResponseSchema = z.array(merchantSchema);

export const UpdateMerchantRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdateMerchantRequestBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    domain: institutionDomainInputSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const UpdateMerchantResponseSchema = merchantSchema;

export const DeleteMerchantRequestParamsSchema = z.object({
  id: z.uuid(),
});

export type Merchant = z.infer<typeof merchantSchema>;
export type CreateMerchantRequestBody = z.infer<typeof CreateMerchantRequestBodySchema>;
export type CreateMerchantResponse = z.infer<typeof CreateMerchantResponseSchema>;
export type ListMerchantsResponse = z.infer<typeof ListMerchantsResponseSchema>;
export type UpdateMerchantRequestParams = z.infer<typeof UpdateMerchantRequestParamsSchema>;
export type UpdateMerchantRequestBody = z.infer<typeof UpdateMerchantRequestBodySchema>;
export type UpdateMerchantResponse = z.infer<typeof UpdateMerchantResponseSchema>;
export type DeleteMerchantRequestParams = z.infer<typeof DeleteMerchantRequestParamsSchema>;
