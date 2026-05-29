import { z } from 'zod';
import { tagsTable } from '@/db/schemas/tags.schema';
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

export type Tag = z.infer<typeof tagSchema>;
export type CreateTagRequestBody = z.infer<typeof CreateTagRequestBodySchema>;
export type CreateTagResponse = z.infer<typeof CreateTagResponseSchema>;
export type ListTagsResponse = z.infer<typeof ListTagsResponseSchema>;
