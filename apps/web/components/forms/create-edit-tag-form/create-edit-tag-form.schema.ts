import { z } from "zod"

export const createEditTagFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a tag name.")
    .max(64, "Name is too long."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a color."),
  icon: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, "Pick an icon.")
    .max(128, "Icon name is too long."),
})

export type CreateEditTagFormValues = z.infer<typeof createEditTagFormSchema>
