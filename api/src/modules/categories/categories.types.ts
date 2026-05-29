import { z } from 'zod';
import { categoriesTable } from '@/db/schemas/categories.schema';
import {
  categoryColorSchema,
  categoryIconSchema,
  categoryTypeSchema,
  type CategoryColor,
  type CategoryIcon,
  type CategoryType,
} from '@/shared/validation/categories';

export { categoryColorSchema, categoryIconSchema, categoryTypeSchema };
export type { CategoryColor, CategoryIcon, CategoryType };

export type CategoryRecord = typeof categoriesTable.$inferSelect;

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

export const CreateCategoryRequestBodySchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.uuid().optional(),
  type: categoryTypeSchema,
  color: categoryColorSchema.optional(),
  icon: categoryIconSchema.optional(),
});

export const CreateCategoryResponseSchema = categorySchema;

export const ListCategoriesResponseSchema = z.array(categorySchema);

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryRequestBody = z.infer<typeof CreateCategoryRequestBodySchema>;
export type CreateCategoryResponse = z.infer<typeof CreateCategoryResponseSchema>;
export type ListCategoriesResponse = z.infer<typeof ListCategoriesResponseSchema>;
