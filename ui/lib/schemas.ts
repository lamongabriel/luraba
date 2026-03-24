import { z } from "zod"

export const transactionFilterSchema = z.object({
  query: z.string().max(100).default(""),
  type: z.enum(["all", "income", "expense", "transfer"]).default("all"),
})

export type TransactionFilterValues = z.infer<typeof transactionFilterSchema>
