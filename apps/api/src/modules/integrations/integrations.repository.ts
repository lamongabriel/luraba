import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { type DbListPage, getPagination } from '@/shared/list';
import {
  buildIntegrationRowsCte,
  buildIntegrationsListOrder,
  buildIntegrationsListWhere,
  type ListIntegrationsRequestQuery,
} from './integrations.query';
import type { IntegrationSummary } from './integrations.types';

type IntegrationListRow = Omit<IntegrationSummary, 'lastCheckedAt'> & {
  lastCheckedAt: Date | string | null;
};

export async function listPage(
  householdId: string,
  query: ListIntegrationsRequestQuery,
): Promise<DbListPage<IntegrationListRow>> {
  const { limit, offset } = getPagination(query);
  const integrationRowsCte = buildIntegrationRowsCte(householdId);
  const where = buildIntegrationsListWhere(query);
  const whereClause = where ? sql`where ${where}` : sql``;
  const orderBy = buildIntegrationsListOrder(query);

  const [countResult, rowsResult] = await Promise.all([
    db.execute<{ count: number }>(sql`
      ${integrationRowsCte}
      select count(*)::integer as count
      from integration_rows
      ${whereClause}
    `),
    db.execute<IntegrationListRow>(sql`
      ${integrationRowsCte}
      select provider, configured, status, "lastCheckedAt"
      from integration_rows
      ${whereClause}
      order by ${sql.join(orderBy, sql`, `)}
      limit ${limit}
      offset ${offset}
    `),
  ]);

  return {
    rows: rowsResult.rows,
    totalCount: countResult.rows[0]?.count ?? 0,
  };
}
