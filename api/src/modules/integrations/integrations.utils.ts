import type { IntegrationProviderId } from '@/config/integrations';
import type { IntegrationSummary } from './integrations.types';

export function buildIntegrationSummary(
  provider: IntegrationProviderId,
  record?: { lastCheckedAt: Date | null },
): IntegrationSummary {
  return {
    provider,
    configured: Boolean(record),
    status: record ? 'connected' : 'not_configured',
    lastCheckedAt: record?.lastCheckedAt?.toISOString() ?? null,
  };
}
