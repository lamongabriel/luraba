import { eq, type SQL, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { brandfetchIntegrationsTable } from '@/db/schemas/brandfetch-integrations.schema';
import {
  booleanQuerySchema,
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  commaSeparatedArraySchema,
  createListQuerySchema,
  inArrayIfAny,
  rangeConditions,
  temporalQuerySchema,
  validateRange,
} from '@/shared/list';
import { integrationProviderSchema, integrationStatusSchema } from './integrations.types';

export const ListIntegrationsRequestQuerySchema = createListQuerySchema(
  {
    providers: commaSeparatedArraySchema(integrationProviderSchema),
    statuses: commaSeparatedArraySchema(integrationStatusSchema),
    configured: booleanQuerySchema.optional(),
    lastCheckedAtFrom: temporalQuerySchema.optional(),
    lastCheckedAtTo: temporalQuerySchema.optional(),
  },
  ['configured', 'lastCheckedAt', 'provider', 'status'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'lastCheckedAtFrom', 'lastCheckedAtTo');
});

export type ListIntegrationsRequestQuery = z.infer<typeof ListIntegrationsRequestQuerySchema>;

export function buildIntegrationRowsCte(householdId: string): SQL {
  return sql`
    with integration_rows as (
      select
        providers.provider::text as provider,
        (${brandfetchIntegrationsTable.id} is not null) as configured,
        case
          when ${brandfetchIntegrationsTable.id} is not null then 'connected'
          else 'not_configured'
        end as status,
        ${brandfetchIntegrationsTable.lastCheckedAt} as "lastCheckedAt"
      from (values ('brandfetch')) as providers(provider)
      left join ${brandfetchIntegrationsTable}
        on ${brandfetchIntegrationsTable.householdId} = ${householdId}
       and providers.provider = 'brandfetch'
    )
  `;
}

export function buildIntegrationsListWhere(query: ListIntegrationsRequestQuery): SQL | undefined {
  return combineConditions(
    buildIlikeSearch(query.search, [sql`provider`, sql`status`]),
    inArrayIfAny(sql`provider`, query.providers),
    inArrayIfAny(sql`status`, query.statuses),
    query.configured === undefined ? undefined : eq(sql`configured`, query.configured),
    ...rangeConditions(sql`"lastCheckedAt"`, query.lastCheckedAtFrom, query.lastCheckedAtTo),
  );
}

export function buildIntegrationsListOrder(query: ListIntegrationsRequestQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      configured: sql`configured`,
      lastCheckedAt: sql`"lastCheckedAt"`,
      provider: sql`provider`,
      status: sql`status`,
    },
    [sql`provider asc`],
  );
}
