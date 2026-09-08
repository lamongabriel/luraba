import { z } from "zod";
import { transactionTypeEnum } from "@/db/schemas/enums.schema";

export const transactionTypeSchema = z.enum(transactionTypeEnum.enumValues);

export type TransactionType = z.infer<typeof transactionTypeSchema>;
