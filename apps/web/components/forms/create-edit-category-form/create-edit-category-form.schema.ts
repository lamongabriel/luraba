import { z } from "zod"

export const createEditCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a category name.")
    .max(255, "Name is too long."),
  type: z.enum(["income", "expense"]),
  parentId: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a color."),
  icon: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, "Pick an icon.")
    .max(128, "Icon name is too long."),
})

export type CreateEditCategoryFormValues = z.infer<
  typeof createEditCategoryFormSchema
>
