import { z } from 'zod';
import { categoriesTable } from '@/db/schemas/categories.schema';

export type Category = typeof categoriesTable.$inferSelect;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
  type: z.enum(['expense', 'income']),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
