import { z } from 'zod';
import { categoryTypeEnum } from '@/db/schemas/enums.schema';

export const categoryTypeSchema = z.enum(categoryTypeEnum.enumValues);

export type CategoryType = z.infer<typeof categoryTypeSchema>;
