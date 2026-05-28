import { z } from 'zod';
import {
  INTEGRATION_PROVIDER_IDS,
  INTEGRATION_STATUS_VALUES,
} from '@/config/integrations';

export const integrationProviderSchema = z.enum(INTEGRATION_PROVIDER_IDS);
export const integrationStatusSchema = z.enum(INTEGRATION_STATUS_VALUES);

export const integrationSummarySchema = z.object({
  provider: integrationProviderSchema,
  configured: z.boolean(),
  status: integrationStatusSchema,
  lastCheckedAt: z.iso.datetime().nullable(),
});

export const ListIntegrationsResponseSchema = z.array(integrationSummarySchema);

export type IntegrationSummary = z.infer<typeof integrationSummarySchema>;
export type ListIntegrationsResponse = z.infer<typeof ListIntegrationsResponseSchema>;
