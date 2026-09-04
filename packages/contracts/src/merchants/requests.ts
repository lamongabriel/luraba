import { z } from "zod";
import { idParamsSchema, institutionDomainInputSchema } from "../common.js";
import {
  booleanQuerySchema,
  createListQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";

export const createMerchantBodySchema = z.object({
  name: z.string().min(1).max(255),
  domain: institutionDomainInputSchema.optional(),
});
export const updateMerchantBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    domain: institutionDomainInputSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const listMerchantsQuerySchema = createListQuerySchema(
  {
    hasDomain: booleanQuerySchema.optional(),
    hasLogo: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ["name", "domain", "createdAt", "updatedAt"],
).superRefine((query, ctx) => {
  validateRange(query, ctx, "createdAtFrom", "createdAtTo");
  validateRange(query, ctx, "updatedAtFrom", "updatedAtTo");
});
export { idParamsSchema };
export type ListMerchantsQuery = z.input<typeof listMerchantsQuerySchema>;
export type CreateMerchantInput = z.input<typeof createMerchantBodySchema>;
export type UpdateMerchantInput = z.input<typeof updateMerchantBodySchema>;
