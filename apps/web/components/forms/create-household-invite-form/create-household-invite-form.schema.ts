import { z } from "zod";

export const createHouseholdInviteFormSchema = z.object({
  name: z.string().trim().max(255, "Keep the name under 255 characters.").optional(),
  email: z.email("Enter a valid email address."),
  role: z.enum(["admin", "member", "viewer"]),
});

export type CreateHouseholdInviteFormValues = z.infer<typeof createHouseholdInviteFormSchema>;
