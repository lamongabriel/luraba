import { z } from 'zod';
import type { tagsTable } from '@/db/schemas/tags.schema';
import { hexColorSchema, iconNameSchema } from '@/shared/validation/categories';

export type TagRecord = typeof tagsTable.$inferSelect;

export const tagSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: hexColorSchema.nullable(),
  icon: iconNameSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CreateTagRequestBodySchema = z.object({
  name: z.string().min(1).max(64),
  color: hexColorSchema.optional(),
  icon: iconNameSchema.optional(),
});

export const CreateTagResponseSchema = tagSchema;

export const ListTagsResponseSchema = z.array(tagSchema);

export const UpdateTagRequestParamsSchema = z.object({
  id: z.uuid(),
});

export const UpdateTagRequestBodySchema = z
  .object({
    name: z.string().min(1).max(64).optional(),
    color: hexColorSchema.nullable().optional(),
    icon: iconNameSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export const UpdateTagResponseSchema = tagSchema;

export const DeleteTagRequestParamsSchema = z.object({
  id: z.uuid(),
});

export type Tag = z.infer<typeof tagSchema>;
export type CreateTagRequestBody = z.infer<typeof CreateTagRequestBodySchema>;
export type CreateTagResponse = z.infer<typeof CreateTagResponseSchema>;
export type ListTagsResponse = z.infer<typeof ListTagsResponseSchema>;
export type UpdateTagRequestParams = z.infer<typeof UpdateTagRequestParamsSchema>;
export type UpdateTagRequestBody = z.infer<typeof UpdateTagRequestBodySchema>;
export type UpdateTagResponse = z.infer<typeof UpdateTagResponseSchema>;
export type DeleteTagRequestParams = z.infer<typeof DeleteTagRequestParamsSchema>;
