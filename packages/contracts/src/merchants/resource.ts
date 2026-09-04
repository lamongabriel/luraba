import { z } from "zod";

export const merchantSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  logoUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Merchant = z.output<typeof merchantSchema>;
