import { transactionTypeEnum } from "@luraba/db/schemas/enums.schema";
import { z } from "zod";

export const transactionTypeSchema = z.enum(transactionTypeEnum.enumValues);

export type TransactionType = z.infer<typeof transactionTypeSchema>;
