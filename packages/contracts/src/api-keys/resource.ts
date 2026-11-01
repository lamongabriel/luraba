import { z } from "zod";
import { wireDateTimeSchema } from "../common.js";

export const apiKeyStatusSchema = z.enum(["active", "disabled", "expired"]);
export type ApiKeyStatus = z.infer<typeof apiKeyStatusSchema>;

/** A key as listed: never carries the secret, only its first characters. */
export const apiKeySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  /** First characters of the key (`lur_ab12...`), enough to recognize it. */
  prefix: z.string(),
  enabled: z.boolean(),
  status: apiKeyStatusSchema,
  expiresAt: wireDateTimeSchema.nullable(),
  lastUsedAt: wireDateTimeSchema.nullable(),
  createdAt: wireDateTimeSchema,
});
export type ApiKey = z.output<typeof apiKeySchema>;

/** Returned once, when the key is created: the only time the secret is visible. */
export const createdApiKeySchema = apiKeySchema.extend({ secret: z.string() });
export type CreatedApiKey = z.output<typeof createdApiKeySchema>;
