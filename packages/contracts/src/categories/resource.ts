import { z } from "zod";
import { hexColorSchema, iconNameSchema } from "../common.js";

export const categoryTypeSchema = z.enum(["expense", "income"]);
export const categoryColorSchema = hexColorSchema;
export const categoryIconSchema = iconNameSchema;
export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  parentId: z.uuid().nullable(),
  type: categoryTypeSchema,
  color: categoryColorSchema.nullable(),
  icon: categoryIconSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Category = z.output<typeof categorySchema>;
export type CategoryType = z.output<typeof categoryTypeSchema>;
export type CategoryColor = z.output<typeof categoryColorSchema>;
export type CategoryIcon = z.output<typeof categoryIconSchema>;
