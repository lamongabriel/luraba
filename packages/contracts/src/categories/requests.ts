import { z } from "zod";
import { idParamsSchema } from "../common.js";
import {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";
import { categoryColorSchema, categoryIconSchema, categoryTypeSchema } from "./resource.js";

export const createCategoryBodySchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.uuid().optional(),
  type: categoryTypeSchema,
  color: categoryColorSchema.optional(),
  icon: categoryIconSchema.optional(),
});
export const updateCategoryBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    parentId: z.uuid().nullable().optional(),
    type: categoryTypeSchema.optional(),
    color: categoryColorSchema.nullable().optional(),
    icon: categoryIconSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const listCategoriesQuerySchema = createListQuerySchema(
  {
    types: commaSeparatedArraySchema(categoryTypeSchema),
    parentIds: commaSeparatedArraySchema(z.uuid()),
    hasParent: booleanQuerySchema.optional(),
    colors: commaSeparatedArraySchema(categoryColorSchema),
    icons: commaSeparatedArraySchema(categoryIconSchema),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ["name", "type", "createdAt", "updatedAt"],
).superRefine((query, ctx) => {
  validateRange(query, ctx, "createdAtFrom", "createdAtTo");
  validateRange(query, ctx, "updatedAtFrom", "updatedAtTo");
});
export { idParamsSchema };
export type ListCategoriesQuery = z.input<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.input<typeof createCategoryBodySchema>;
export type UpdateCategoryInput = z.input<typeof updateCategoryBodySchema>;
