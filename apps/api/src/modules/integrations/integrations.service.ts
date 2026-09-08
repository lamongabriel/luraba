import type { Integration } from "@luraba/contracts/integrations";
import { formatISODateTime, toDate } from "@luraba/domain";
import type { HouseholdContext } from "@/config/permissions";
import { createListMeta, type ListResult } from "@/shared/list";
import type { ListIntegrationsQuery } from "./integrations.query";
import * as integrationsRepository from "./integrations.repository";

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
      lastCheckedAt: row.lastCheckedAt ? formatISODateTime(toDate(row.lastCheckedAt)) : null,
    })),
    meta: createListMeta(query, page.totalCount),
  };
}
