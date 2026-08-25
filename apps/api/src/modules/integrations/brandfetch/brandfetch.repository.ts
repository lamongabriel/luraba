import type { HouseholdContext } from '@/config/permissions';
import { brandfetchIntegrationsTable } from '@/db/schemas/brandfetch-integrations.schema';
import { HouseholdScopedRepository } from '@/shared/repositories/household-scoped.repository';

export type BrandfetchIntegrationRecord = typeof brandfetchIntegrationsTable.$inferSelect;
type CreateBrandfetchIntegrationValues = Omit<
  typeof brandfetchIntegrationsTable.$inferInsert,
  'id' | 'householdId' | 'createdAt' | 'updatedAt'
>;

class BrandfetchRepository extends HouseholdScopedRepository<
  BrandfetchIntegrationRecord,
  CreateBrandfetchIntegrationValues
> {
  constructor() {
    super(brandfetchIntegrationsTable);
  }

  async findByHousehold(
    context: HouseholdContext,
  ): Promise<BrandfetchIntegrationRecord | undefined> {
    const rows = await this.list(context);
    return rows[0];
  }

  async upsert(
    context: HouseholdContext,
    values: { encryptedClientId: string; lastCheckedAt: Date },
  ): Promise<BrandfetchIntegrationRecord> {
    const existing = await this.findByHousehold(context);

    if (existing) {
      return (await this.update(existing.id, context, values)) as BrandfetchIntegrationRecord;
    }

    return this.create(context, values);
  }

  async deleteByHousehold(context: HouseholdContext): Promise<void> {
    const existing = await this.findByHousehold(context);
    if (!existing) {
      return;
    }

    await super.delete(existing.id, context);
  }
}

export const brandfetchRepository = new BrandfetchRepository();
