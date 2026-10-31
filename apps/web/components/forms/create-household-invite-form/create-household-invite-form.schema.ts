import { z } from "zod";

export const createHouseholdInviteFormSchema = z.object({
  email: z.email("Enter a valid email address."),
  role: z.enum(["admin", "member", "viewer"]),
});

export type CreateHouseholdInviteFormValues = z.infer<typeof createHouseholdInviteFormSchema>;
