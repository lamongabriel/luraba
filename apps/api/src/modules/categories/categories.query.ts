import { eq, type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { categoriesTable } from '@/db/schemas/categories.schema';
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
import {
  categoryColorSchema,
  categoryIconSchema,
  categoryTypeSchema,
} from '@/shared/validation/categories';

export const ListCategoriesRequestQuerySchema = createListQuerySchema(
  {
    types: commaSeparatedArraySchema(categoryTypeSchema),
    parentIds: commaSeparatedArraySchema(z.uuid()),
    hasParent: booleanQuerySchema.optional(),
    colors: commaSeparatedArraySchema(categoryColorSchema),
    icons: commaSeparatedArraySchema(categoryIconSchema),
    createdAtFrom: temporalQuerySchema.optional(),
    createdAtTo: temporalQuerySchema.optional(),
    updatedAtFrom: temporalQuerySchema.optional(),
    updatedAtTo: temporalQuerySchema.optional(),
  },
  ['name', 'type', 'createdAt', 'updatedAt'],
).superRefine((query, ctx) => {
  validateRange(query, ctx, 'createdAtFrom', 'createdAtTo');
  validateRange(query, ctx, 'updatedAtFrom', 'updatedAtTo');
});

export type ListCategoriesRequestQuery = z.infer<typeof ListCategoriesRequestQuerySchema>;

export function buildCategoriesListWhere(
  householdId: string,
  query: ListCategoriesRequestQuery,
): SQL {
  return combineConditions(
    eq(categoriesTable.householdId, householdId),
    buildIlikeSearch(query.search, [sql`${categoriesTable.name}`, sql`${categoriesTable.type}`]),
    inArrayIfAny(categoriesTable.type, query.types),
    inArrayIfAny(categoriesTable.parentId, query.parentIds),
    nullabilityCondition(categoriesTable.parentId, query.hasParent),
    inArrayIfAny(categoriesTable.color, query.colors),
    inArrayIfAny(categoriesTable.icon, query.icons),
    ...rangeConditions(categoriesTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(categoriesTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildCategoriesListOrder(query: ListCategoriesRequestQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      createdAt: sql`${categoriesTable.createdAt}`,
      name: sql`${categoriesTable.name}`,
      type: sql`${categoriesTable.type}`,
      updatedAt: sql`${categoriesTable.updatedAt}`,
    },
    [sql`${categoriesTable.name} asc`, sql`${categoriesTable.id} asc`],
  );
}
