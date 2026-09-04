import type { listTagsQuerySchema } from '@luraba/contracts/tags';
import { eq, type SQL, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { tagsTable } from '@/db/schemas/tags.schema';
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  inArrayIfAny,
  nullabilityCondition,
  rangeConditions,
} from '@/shared/list';

export type ListTagsQuery = z.output<typeof listTagsQuerySchema>;

export function buildTagsListWhere(householdId: string, query: ListTagsQuery): SQL {
  return combineConditions(
    eq(tagsTable.householdId, householdId),
    buildIlikeSearch(query.search, [
      sql`${tagsTable.name}`,
      sql`${tagsTable.color}`,
      sql`${tagsTable.icon}`,
    ]),
    inArrayIfAny(tagsTable.color, query.colors),
    inArrayIfAny(tagsTable.icon, query.icons),
    nullabilityCondition(tagsTable.color, query.hasColor),
    nullabilityCondition(tagsTable.icon, query.hasIcon),
    ...rangeConditions(tagsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(tagsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildTagsListOrder(query: ListTagsQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      color: sql`${tagsTable.color}`,
      createdAt: sql`${tagsTable.createdAt}`,
      icon: sql`${tagsTable.icon}`,
      name: sql`${tagsTable.name}`,
      updatedAt: sql`${tagsTable.updatedAt}`,
    },
    [sql`${tagsTable.name} asc`, sql`${tagsTable.id} asc`],
  );
}
