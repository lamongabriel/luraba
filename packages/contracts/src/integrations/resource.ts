import { z } from "zod";

export const INTEGRATION_PROVIDER_IDS = ["brandfetch"] as const;
export const INTEGRATION_STATUS_VALUES = ["not_configured", "connected"] as const;
export const integrationProviderSchema = z.enum(INTEGRATION_PROVIDER_IDS);
export const integrationStatusSchema = z.enum(INTEGRATION_STATUS_VALUES);
export const integrationSchema = z.object({
  provider: integrationProviderSchema,
  configured: z.boolean(),
  status: integrationStatusSchema,
  lastCheckedAt: z.iso.datetime().nullable(),
});
export type Integration = z.output<typeof integrationSchema>;
export type IntegrationProvider = z.output<typeof integrationProviderSchema>;
export type IntegrationStatus = z.output<typeof integrationStatusSchema>;
