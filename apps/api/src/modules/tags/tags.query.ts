import { eq, type SQL, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { tagsTable } from '@/db/schemas/tags.schema';
import {
  booleanQuerySchema,
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  commaSeparatedArraySchema,
  createListQuerySchema,
  inArrayIfAny,
  nullabilityCondition,
  rangeConditions,
  temporalQuerySchema,
  validateRange,
} from '@/shared/list';
import { hexColorSchema, iconNameSchema } from '@/shared/validation/categories';

export const ListTagsRequestQuerySchema = createListQuerySchema(
  {
    colors: commaSeparatedArraySchema(hexColorSchema),
    icons: commaSeparatedArraySchema(iconNameSchema),
    hasColor: booleanQuerySchema.optional(),
    hasIcon: booleanQuerySchema.optional(),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ['name', 'color', 'icon', 'createdAt', 'updatedAt'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListTagsRequestQuery = z.infer<typeof ListTagsRequestQuerySchema>;

export function buildTagsListWhere(householdId: string, query: ListTagsRequestQuery): SQL {
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

export function buildTagsListOrder(query: ListTagsRequestQuery): SQL[] {
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
