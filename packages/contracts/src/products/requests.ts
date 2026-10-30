import { z } from "zod";
import { currencyCodeSchema, idParamsSchema, moneyAmountSchema } from "../common.js";
import { booleanQuerySchema, createListQuerySchema } from "../list.js";

export const createProductBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  price: moneyAmountSchema.nullable().optional(),
  /** Defaults to the household currency. */
  currencyCode: currencyCodeSchema.optional(),
});
export const updateProductBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    price: moneyAmountSchema.nullable().optional(),
    imageUploadId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const listProductsQuerySchema = createListQuerySchema(
  {
    hasImage: booleanQuerySchema.optional(),
  },
  ["name", "price", "createdAt", "updatedAt"],
);
export { idParamsSchema };
export type ListProductsQuery = z.input<typeof listProductsQuerySchema>;
export type CreateProductInput = z.input<typeof createProductBodySchema>;
export type UpdateProductInput = z.input<typeof updateProductBodySchema>;
