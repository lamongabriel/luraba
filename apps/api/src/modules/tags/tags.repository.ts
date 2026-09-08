import { and, eq, inArray, sql } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { tagsTable } from "@/db/schemas/tags.schema";
import { type DbListPage, getPagination } from "@/shared/list";
import { HouseholdScopedRepository } from "@/shared/repositories/household-scoped.repository";
import { buildTagsListOrder, buildTagsListWhere, type ListTagsQuery } from "./tags.query";
import type { TagRecord } from "./tags.types";

type CreateTagValues = Omit<
  typeof tagsTable.$inferInsert,
  "id" | "householdId" | "createdAt" | "updatedAt"
>;

class TagsRepository extends HouseholdScopedRepository<TagRecord, CreateTagValues> {
  constructor() {
    super(tagsTable, { orderBy: tagsTable.name });
  }

  async findByHouseholdAndName(
    context: HouseholdContext,
    name: string,
  ): Promise<TagRecord | undefined> {
    const rows = await db
      .select()
      .from(tagsTable)
      .where(and(eq(tagsTable.householdId, context.householdId), eq(tagsTable.name, name)))
      .limit(1);

    return rows[0];
  }

  async listPage(context: HouseholdContext, query: ListTagsQuery): Promise<DbListPage<TagRecord>> {
    const where = buildTagsListWhere(context.householdId, query);
    const orderBy = buildTagsListOrder(query);
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::integer` }).from(tagsTable).where(where),
      db
        .select()
        .from(tagsTable)
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

  async findByIds(context: HouseholdContext, tagIds: string[]): Promise<TagRecord[]> {
    if (tagIds.length === 0) {
      return [];
    }

    return this.findByIdsForHousehold(context.householdId, tagIds);
  }

  private async findByIdsForHousehold(householdId: string, tagIds: string[]): Promise<TagRecord[]> {
    return db
      .select()
      .from(tagsTable)
      .where(and(eq(tagsTable.householdId, householdId), inArray(tagsTable.id, tagIds)));
  }
}

export const tagsRepository = new TagsRepository();
