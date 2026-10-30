import { z } from "zod";
import { createdByUserIdSchema } from "../common.js";

export const merchantSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  logoUrl: z.string().nullable(),
  imageUploadId: z.uuid().nullable(),
  createdByUserId: createdByUserIdSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Merchant = z.output<typeof merchantSchema>;
