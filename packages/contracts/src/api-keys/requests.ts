import { z } from "zod";

export const API_KEY_NAME_MAX_LENGTH = 80;
export const API_KEY_MAX_EXPIRY_DAYS = 3650;
/** Prefix of every key (`lur_...`); also what the API looks for in `Authorization: Bearer`. */
export const API_KEY_PREFIX = "lur_";

const apiKeyNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a label")
  .max(API_KEY_NAME_MAX_LENGTH, `Use ${API_KEY_NAME_MAX_LENGTH} characters or fewer`);

export const apiKeyIdParamsSchema = z.object({ id: z.uuid() });

export const createApiKeyBodySchema = z.object({
  name: apiKeyNameSchema,
  /** Days until the key stops working; omit or null for a key that never expires. */
  expiresInDays: z.number().int().min(1).max(API_KEY_MAX_EXPIRY_DAYS).nullish(),
});
export type CreateApiKeyInput = z.input<typeof createApiKeyBodySchema>;

export const updateApiKeyBodySchema = z
  .object({
    name: apiKeyNameSchema,
    enabled: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");
export type UpdateApiKeyInput = z.input<typeof updateApiKeyBodySchema>;
