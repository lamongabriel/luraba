import { and, eq, inArray } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { categoriesTable } from '@/db/schemas/categories.schema';
import { HouseholdScopedRepository } from '@/shared/repositories/household-scoped.repository';
import type { CategoryRecord } from './categories.types';

type CreateCategoryValues = Omit<
  typeof categoriesTable.$inferInsert,
  'id' | 'householdId' | 'createdAt' | 'updatedAt'
>;

class CategoriesRepository extends HouseholdScopedRepository<CategoryRecord, CreateCategoryValues> {
  constructor() {
    super(categoriesTable, { orderBy: categoriesTable.name });
  }

  async findByHouseholdAndName(
    context: HouseholdContext,
    name: string,
  ): Promise<CategoryRecord | undefined> {
    const rows = await this.list(context);
    return rows.find((category) => category.name === name);
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
