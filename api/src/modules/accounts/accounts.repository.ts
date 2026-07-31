import { and, eq, sql } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import type { TxClient } from '@/db/types';
import { buildAccountBalanceSubquery } from '@/modules/ledger-accounts/ledger-accounts.repository';
import { now } from '@/shared/lib/date';
import { type DbListPage, getPagination } from '@/shared/list';
import { HouseholdScopedRepository } from '@/shared/repositories/household-scoped.repository';
import {
  buildAccountsListOrder,
  buildAccountsListWhere,
  type ListAccountsRequestQuery,
} from './accounts.query';
import type { AccountRecord } from './accounts.types';

type CreateAccountValues = Omit<
  typeof accountsTable.$inferInsert,
  'id' | 'householdId' | 'createdAt' | 'updatedAt'
>;
type AccountDetailsRecord = AccountRecord & { balance: number };

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

  async listPage(
    context: HouseholdContext,
    query: ListAccountsRequestQuery,
  ): Promise<DbListPage<AccountDetailsRecord>> {
    const accountBalances = buildAccountBalanceSubquery();
    const rawBalance = sql<number>`coalesce(${accountBalances.balance}, 0)::integer`;
    const displayedBalance = sql<number>`case when ${accountsTable.classification} = 'asset' then ${rawBalance} else -${rawBalance} end`;
    const where = buildAccountsListWhere(context.householdId, query, displayedBalance);
    const orderBy = buildAccountsListOrder(query, displayedBalance);
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::integer` })
        .from(accountsTable)
        .leftJoin(accountBalances, eq(accountBalances.accountId, accountsTable.id))
        .where(where),
      db
        .select({
          id: accountsTable.id,
          householdId: accountsTable.householdId,
          name: accountsTable.name,
          institutionName: accountsTable.institutionName,
          institutionDomain: accountsTable.institutionDomain,
          institutionLogoUrl: accountsTable.institutionLogoUrl,
          notes: accountsTable.notes,
          classification: accountsTable.classification,
          type: accountsTable.type,
          currencyId: accountsTable.currencyId,
          createdAt: accountsTable.createdAt,
          updatedAt: accountsTable.updatedAt,
          balance: rawBalance,
        })
        .from(accountsTable)
        .leftJoin(accountBalances, eq(accountBalances.accountId, accountsTable.id))
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
