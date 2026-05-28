import { z } from 'zod';
import { accountClassificationEnum, accountTypeEnum } from '@/db/schemas/enums.schema';

export const accountClassificationSchema = z.enum(accountClassificationEnum.enumValues);
export const accountTypeSchema = z.enum(accountTypeEnum.enumValues);

export type AccountClassification = z.infer<typeof accountClassificationSchema>;
export type AccountType = z.infer<typeof accountTypeSchema>;
