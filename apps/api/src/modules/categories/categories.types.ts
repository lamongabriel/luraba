import { z } from 'zod';
import type { categoriesTable } from '@/db/schemas/categories.schema';
import {
  type CategoryColor,
  type CategoryIcon,
  type CategoryType,
  categoryColorSchema,
  categoryIconSchema,
  categoryTypeSchema,
} from '@/shared/validation/categories';

export type { CategoryColor, CategoryIcon, CategoryType };
export { categoryColorSchema, categoryIconSchema, categoryTypeSchema };

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

export const UpdateCategoryRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdateCategoryRequestBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    parentId: z.uuid().nullable().optional(),
    type: categoryTypeSchema.optional(),
    color: categoryColorSchema.nullable().optional(),
    icon: categoryIconSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const UpdateCategoryResponseSchema = categorySchema;

export const DeleteCategoryRequestParamsSchema = z.object({
  id: z.uuid(),
});

export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryRequestBody = z.infer<typeof CreateCategoryRequestBodySchema>;
export type CreateCategoryResponse = z.infer<typeof CreateCategoryResponseSchema>;
export type ListCategoriesResponse = z.infer<typeof ListCategoriesResponseSchema>;
export type UpdateCategoryRequestParams = z.infer<typeof UpdateCategoryRequestParamsSchema>;
export type UpdateCategoryRequestBody = z.infer<typeof UpdateCategoryRequestBodySchema>;
export type UpdateCategoryResponse = z.infer<typeof UpdateCategoryResponseSchema>;
export type DeleteCategoryRequestParams = z.infer<typeof DeleteCategoryRequestParamsSchema>;
