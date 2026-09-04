import { z } from "zod";
import { hexColorSchema, iconNameSchema, idParamsSchema } from "../common.js";
import {
  booleanQuerySchema,
  commaSeparatedArraySchema,
  createListQuerySchema,
  temporalQuerySchema,
  validateRange,
} from "../list.js";
export const createTagBodySchema = z.object({
  name: z.string().min(1).max(64),
  color: hexColorSchema.optional(),
  icon: iconNameSchema.optional(),
});
export const updateTagBodySchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    color: hexColorSchema.nullable().optional(),
    icon: iconNameSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const listTagsQuerySchema = createListQuerySchema(
  {
    colors: commaSeparatedArraySchema(hexColorSchema),
    icons: commaSeparatedArraySchema(iconNameSchema),
    hasColor: booleanQuerySchema.optional(),
    hasIcon: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ["name", "color", "icon", "createdAt", "updatedAt"],
).superRefine((query, ctx) => {
  validateRange(query, ctx, "createdAtFrom", "createdAtTo");
  validateRange(query, ctx, "updatedAtFrom", "updatedAtTo");
});
export { idParamsSchema };

export type CreateTagInput = z.input<typeof createTagBodySchema>;
export type ListTagsQuery = z.input<typeof listTagsQuerySchema>;
export type UpdateTagInput = z.input<typeof updateTagBodySchema>;
