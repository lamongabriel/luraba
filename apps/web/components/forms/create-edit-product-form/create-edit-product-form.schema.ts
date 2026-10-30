import { z } from "zod";

export const createEditProductFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name.").max(255, "Name is too long."),
  price: z.union([z.number(), z.literal("")]),
});

export type CreateEditProductFormValues = z.infer<typeof createEditProductFormSchema>;
