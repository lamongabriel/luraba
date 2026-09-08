import type { listCategoriesQuerySchema } from "@luraba/contracts/categories";
import { eq, type SQL, sql } from "drizzle-orm";
import type { z } from "zod";
import { categoriesTable } from "@/db/schemas/categories.schema";
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  inArrayIfAny,
  nullabilityCondition,
  rangeConditions,
} from "@/shared/list";

export type ListCategoriesQuery = z.output<typeof listCategoriesQuerySchema>;

export function buildCategoriesListWhere(householdId: string, query: ListCategoriesQuery): SQL {
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

export function buildCategoriesListOrder(query: ListCategoriesQuery): SQL[] {
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
