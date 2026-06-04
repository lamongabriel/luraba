import { and, eq, inArray } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { tagsTable } from '@/db/schemas/tags.schema';
import { HouseholdScopedRepository } from '@/shared/repositories/household-scoped.repository';
import type { TagRecord } from './tags.types';

type CreateTagValues = Omit<
  typeof tagsTable.$inferInsert,
  'id' | 'householdId' | 'createdAt' | 'updatedAt'
>;

class TagsRepository extends HouseholdScopedRepository<TagRecord, CreateTagValues> {
  constructor() {
    super(tagsTable, { orderBy: tagsTable.name });
  }

  async findByHouseholdAndName(
    context: HouseholdContext,
    name: string,
  ): Promise<TagRecord | undefined> {
    const tags = await this.list(context);
    return tags.find((tag) => tag.name === name);
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
