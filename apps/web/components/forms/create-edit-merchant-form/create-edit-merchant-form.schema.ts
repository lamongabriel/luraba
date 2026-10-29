import { z } from "zod";

export const createEditMerchantFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a merchant name.").max(255, "Name is too long."),
  domain: z.string().trim().max(255, "Domain is too long."),
});

export type CreateEditMerchantFormValues = z.infer<typeof createEditMerchantFormSchema>;
