import {
  creditCardCycleStatusEnum,
  creditCardProductTypeEnum,
} from "@luraba/db/schemas/enums.schema";
import { z } from "zod";

export const creditCardProductTypeSchema = z.enum(creditCardProductTypeEnum.enumValues);
export const creditCardCycleStatusSchema = z.enum(creditCardCycleStatusEnum.enumValues);

export type CreditCardProductType = z.infer<typeof creditCardProductTypeSchema>;
export type CreditCardCycleStatus = z.infer<typeof creditCardCycleStatusSchema>;
