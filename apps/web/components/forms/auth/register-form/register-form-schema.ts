import { z } from "zod"

export const registerFormSchema = z
  .object({
    confirmPassword: z.string().min(8, "Confirm your password."),
    email: z.email("Enter a valid email address."),
    name: z.string().min(2, "Name must be at least 2 characters."),
    password: z.string().min(8, "Password must be at least 8 characters."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  })

export type RegisterFormValues = z.infer<typeof registerFormSchema>
