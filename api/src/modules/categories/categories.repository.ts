import type { HouseholdContext } from '@/config/permissions';
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

  async findByHouseholdAndName(context: HouseholdContext, name: string): Promise<CategoryRecord | undefined> {
    const rows = await this.list(context);
    return rows.find((category) => category.name === name);
  }
}

export const categoriesRepository = new CategoriesRepository();
