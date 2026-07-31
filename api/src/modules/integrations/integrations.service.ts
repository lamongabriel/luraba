import type { HouseholdContext } from '@/config/permissions';
import { formatISODateTime } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import type { ListIntegrationsRequestQuery } from './integrations.query';
import * as integrationsRepository from './integrations.repository';
import type { IntegrationSummary } from './integrations.types';

export async function listIntegrations(
  context: HouseholdContext,
  query: ListIntegrationsRequestQuery,
): Promise<ListResult<IntegrationSummary>> {
  const page = await integrationsRepository.listPage(context.householdId, query);

  return {
    data: page.rows.map((row) => ({
      provider: row.provider,
      configured: row.configured,
      status: row.status,
      lastCheckedAt: row.lastCheckedAt ? formatISODateTime(new Date(row.lastCheckedAt)) : null,
    })),
    meta: createListMeta(query, page.totalCount),
  };
}
