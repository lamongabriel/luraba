import { z } from "zod"

export const loginFormSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
