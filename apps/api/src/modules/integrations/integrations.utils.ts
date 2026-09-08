import type { Integration } from "@luraba/contracts/integrations";
import type { IntegrationProviderId } from "@/config/integrations";
import { formatISODateTime } from "@/shared/lib/date";

export function buildIntegrationSummary(
  provider: IntegrationProviderId,
  record?: { lastCheckedAt: Date | null },
): Integration {
  return {
    provider,
    configured: Boolean(record),
    status: record ? "connected" : "not_configured",
    lastCheckedAt: record?.lastCheckedAt ? formatISODateTime(record.lastCheckedAt) : null,
  };
}
