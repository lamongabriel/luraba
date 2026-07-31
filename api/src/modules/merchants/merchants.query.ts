import { eq, type SQL, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import {
  booleanQuerySchema,
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  createListQuerySchema,
  nullabilityCondition,
  rangeConditions,
  temporalQuerySchema,
  validateRange,
} from '@/shared/list';

export const ListMerchantsRequestQuerySchema = createListQuerySchema(
  {
    hasDomain: booleanQuerySchema.optional(),
    hasLogo: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ['name', 'domain', 'createdAt', 'updatedAt'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListMerchantsRequestQuery = z.infer<typeof ListMerchantsRequestQuerySchema>;

export function buildMerchantsListWhere(
  householdId: string,
  query: ListMerchantsRequestQuery,
): SQL {
  return combineConditions(
    eq(merchantsTable.householdId, householdId),
    buildIlikeSearch(query.search, [sql`${merchantsTable.name}`, sql`${merchantsTable.domain}`]),
    nullabilityCondition(merchantsTable.domain, query.hasDomain),
    nullabilityCondition(merchantsTable.logoUrl, query.hasLogo),
    ...rangeConditions(merchantsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(merchantsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildMerchantsListOrder(query: ListMerchantsRequestQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      createdAt: sql`${merchantsTable.createdAt}`,
      domain: sql`${merchantsTable.domain}`,
      name: sql`${merchantsTable.name}`,
      updatedAt: sql`${merchantsTable.updatedAt}`,
    },
    [sql`${merchantsTable.name} asc`, sql`${merchantsTable.id} asc`],
  );
}
