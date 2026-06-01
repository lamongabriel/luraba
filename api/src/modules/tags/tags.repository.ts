import type { HouseholdContext } from '@/config/permissions';
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
}

export const tagsRepository = new TagsRepository();
