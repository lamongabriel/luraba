import { and, eq, sql } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { HouseholdScopedRepository } from '@/shared/repositories/household-scoped.repository';
import type { AccountRecord } from './accounts.types';

class AccountRepository extends HouseholdScopedRepository<AccountRecord> {
  constructor() {
    super(accountsTable, { orderBy: accountsTable.name });
  }

  async findCurrencyByCode(currencyCode: string): Promise<{ code: string } | undefined> {
    const rows = await db
      .select({ code: currenciesTable.code })
      .from(currenciesTable)
      .where(eq(currenciesTable.code, currencyCode));
    return rows[0];
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

  async findLedgerByAccountId(accountId: string): Promise<
    | {
        id: string;
        classification: 'asset' | 'liability';
        currencyId: string;
      }
    | undefined
  > {
    const rows = await db
      .select({
        id: ledgerAccountsTable.id,
        classification: ledgerAccountsTable.classification,
        currencyId: ledgerAccountsTable.currencyId,
      })
      .from(ledgerAccountsTable)
      .where(
        and(
          eq(ledgerAccountsTable.ownerType, 'account'),
          eq(ledgerAccountsTable.ownerId, accountId),
        ),
      );

    return rows[0];
  }

  async getAccountBalanceByLedgerId(ledgerAccountId: string): Promise<number> {
    const [row] = await db
      .select({
        balance: sql<number>`coalesce(sum(${entriesTable.amount}), 0)::integer`,
      })
      .from(entriesTable)
      .where(eq(entriesTable.ledgerAccountId, ledgerAccountId));

    return row?.balance ?? 0;
  }
}

export const accountsRepository = new AccountRepository();
