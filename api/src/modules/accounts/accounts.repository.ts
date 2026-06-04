import { and, eq } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import type { TxClient } from '@/db/types';
import { now } from '@/shared/lib/date';
import { HouseholdScopedRepository } from '@/shared/repositories/household-scoped.repository';
import type { AccountRecord } from './accounts.types';

type CreateAccountValues = Omit<
  typeof accountsTable.$inferInsert,
  'id' | 'householdId' | 'createdAt' | 'updatedAt'
>;

class AccountRepository extends HouseholdScopedRepository<AccountRecord> {
  constructor() {
    super(accountsTable, { orderBy: accountsTable.name });
  }

  async findByHouseholdAndName(
    context: HouseholdContext,
    name: string,
  ): Promise<AccountRecord | undefined> {
    const rows = await db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.householdId, context.householdId), eq(accountsTable.name, name)));
    return rows[0];
  }

  async createInTransaction(
    tx: TxClient,
    context: HouseholdContext,
    values: CreateAccountValues,
  ): Promise<AccountRecord> {
    const timestamp = now();
    const rows = await tx
      .insert(accountsTable)
      .values({
        ...values,
        householdId: context.householdId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    return rows[0];
  }

  async deleteInTransaction(
    tx: TxClient,
    context: HouseholdContext,
    accountId: string,
  ): Promise<AccountRecord | undefined> {
    const rows = await tx
      .delete(accountsTable)
      .where(
        and(eq(accountsTable.id, accountId), eq(accountsTable.householdId, context.householdId)),
      )
      .returning();

    return rows[0];
  }

  async updateInTransaction(
    tx: TxClient,
    context: HouseholdContext,
    accountId: string,
    values: Partial<CreateAccountValues>,
  ): Promise<AccountRecord | undefined> {
    const rows = await tx
      .update(accountsTable)
      .set({
        ...values,
        updatedAt: now(),
      })
      .where(
        and(eq(accountsTable.id, accountId), eq(accountsTable.householdId, context.householdId)),
      )
      .returning();

    return rows[0];
  }
}

export const accountsRepository = new AccountRepository();
