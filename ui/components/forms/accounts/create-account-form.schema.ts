import { z } from "zod"

import { CREATABLE_ACCOUNT_TYPES } from "@/lib/accounts"

export const createAccountFormSchema = z.object({
  currencyCode: z
    .string()
    .trim()
    .length(3, "Use a 3-letter currency code."),
  institutionDomain: z.string(),
  institutionName: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "Enter an account name.")
    .max(255, "Name is too long."),
  notes: z.string().max(4000, "Notes are too long."),
  type: z.enum(CREATABLE_ACCOUNT_TYPES),
})

export type CreateAccountFormValues = z.infer<typeof createAccountFormSchema>
