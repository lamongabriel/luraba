import { and, eq } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import { HouseholdScopedRepository } from '@/shared/repositories/household-scoped.repository';
import type { MerchantRecord } from './merchants.types';

type CreateMerchantValues = Omit<
  typeof merchantsTable.$inferInsert,
  'id' | 'householdId' | 'createdAt' | 'updatedAt'
>;

class MerchantRepository extends HouseholdScopedRepository<MerchantRecord, CreateMerchantValues> {
  constructor() {
    super(merchantsTable, { orderBy: merchantsTable.name });
  }

  async findByName(context: HouseholdContext, name: string): Promise<MerchantRecord | undefined> {
    const rows = await db
      .select()
      .from(merchantsTable)
      .where(
        and(eq(merchantsTable.householdId, context.householdId), eq(merchantsTable.name, name)),
      )
      .limit(1);

    return rows[0];
  }
}

export const merchantsRepository = new MerchantRepository();
