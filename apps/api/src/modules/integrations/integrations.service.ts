import type { Integration } from '@luraba/contracts/integrations';
import type { HouseholdContext } from '@/config/permissions';
import { formatISODateTime } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import type { ListIntegrationsQuery } from './integrations.query';
import * as integrationsRepository from './integrations.repository';

export async function listIntegrations(
  context: HouseholdContext,
  query: ListIntegrationsQuery,
): Promise<ListResult<Integration>> {
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
