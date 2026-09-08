import { and, eq, inArray, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { categoriesTable } from "@/db/schemas/categories.schema";
import { type DbListPage, getPagination } from "@/shared/list";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import {
  buildCategoriesListOrder,
  buildCategoriesListWhere,
  type ListCategoriesQuery,
} from "./categories.query";
import type { CategoryRecord } from "./categories.types";

type CreateCategoryValues = Omit<
  typeof categoriesTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class CategoriesRepository extends HouseholdScopedRepository<CategoryRecord, CreateCategoryValues> {
  constructor() {
    super(categoriesTable, { orderBy: categoriesTable.name });
  }

  async findByHouseholdAndName(
    context: HouseholdContext,
    name: string,
  ): Promise<CategoryRecord | undefined> {
    const rows = await db
      .select()
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.householdId, context.householdId), eq(categoriesTable.name, name)),
      )
      .limit(1);

    return rows[0];
  }

  async listPage(
    context: HouseholdContext,
    query: ListCategoriesQuery,
  ): Promise<DbListPage<CategoryRecord>> {
    const where = buildCategoriesListWhere(context.householdId, query);
    const orderBy = buildCategoriesListOrder(query);
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::integer` }).from(categoriesTable).where(where),
      db
        .select()
        .from(categoriesTable)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows,
      totalCount: countRow[0]?.count ?? 0,
    };
  }

  async findByIds(context: HouseholdContext, categoryIds: string[]): Promise<CategoryRecord[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    return db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.householdId, context.householdId),
          inArray(categoriesTable.id, categoryIds),
        ),
      );
  }
}

export const categoriesRepository = new CategoriesRepository();
