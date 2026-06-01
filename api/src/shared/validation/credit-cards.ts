import { z } from 'zod';
import { creditCardCycleStatusEnum, creditCardProductTypeEnum } from '@/db/schemas/enums.schema';

export const creditCardProductTypeSchema = z.enum(creditCardProductTypeEnum.enumValues);
export const creditCardCycleStatusSchema = z.enum(creditCardCycleStatusEnum.enumValues);

export type CreditCardProductType = z.infer<typeof creditCardProductTypeSchema>;
export type CreditCardCycleStatus = z.infer<typeof creditCardCycleStatusSchema>;
