import { and, eq, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import type { TxClient } from '@/db/types';

const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000000';

type LedgerOwnerType = typeof ledgerAccountsTable.$inferSelect.ownerType;
type LedgerClassification = typeof ledgerAccountsTable.$inferSelect.classification;

export type LedgerAccountSummary = {
  id: string;
  classification: LedgerClassification;
  currencyId: string;
  systemKey: string | null;
};

class LedgerAccountsRepository {
  async findByOwner(
    ownerType: LedgerOwnerType,
    ownerId: string,
  ): Promise<LedgerAccountSummary | undefined> {
    const rows = await db
      .select({
        id: ledgerAccountsTable.id,
        classification: ledgerAccountsTable.classification,
        currencyId: ledgerAccountsTable.currencyId,
        systemKey: ledgerAccountsTable.systemKey,
      })
      .from(ledgerAccountsTable)
      .where(
        and(eq(ledgerAccountsTable.ownerType, ownerType), eq(ledgerAccountsTable.ownerId, ownerId)),
      );

    return rows[0];
  }

  async findOrCreateSystem(
    tx: TxClient,
    key: string,
    classification: LedgerClassification,
    currencyCode: string,
  ): Promise<Omit<LedgerAccountSummary, 'systemKey'>> {
    const rows = await tx
      .select({
        id: ledgerAccountsTable.id,
        classification: ledgerAccountsTable.classification,
        currencyId: ledgerAccountsTable.currencyId,
      })
      .from(ledgerAccountsTable)
      .where(eq(ledgerAccountsTable.systemKey, key));

    if (rows[0]) {
      return rows[0];
    }

    const created = await tx
      .insert(ledgerAccountsTable)
      .values({
        classification,
        ownerType: 'system',
        ownerId: SYSTEM_OWNER_ID,
        currencyId: currencyCode,
        systemKey: key,
      })
      .returning({
        id: ledgerAccountsTable.id,
        classification: ledgerAccountsTable.classification,
        currencyId: ledgerAccountsTable.currencyId,
      });

    return created[0];
  }

  async createForAccount(
    tx: TxClient,
    values: {
      accountId: string;
      classification: LedgerClassification;
      currencyCode: string;
    },
  ): Promise<LedgerAccountSummary> {
    const rows = await tx
      .insert(ledgerAccountsTable)
      .values({
        classification: values.classification,
        ownerType: 'account',
        ownerId: values.accountId,
        currencyId: values.currencyCode,
      })
      .returning({
        id: ledgerAccountsTable.id,
        classification: ledgerAccountsTable.classification,
        currencyId: ledgerAccountsTable.currencyId,
        systemKey: ledgerAccountsTable.systemKey,
      });

    return rows[0];
  }

  async getBalance(ledgerAccountId: string): Promise<number> {
    const [row] = await db
      .select({
        balance: sql<number>`coalesce(sum(${entriesTable.amount}), 0)`.mapWith(Number),
      })
      .from(entriesTable)
      .where(eq(entriesTable.ledgerAccountId, ledgerAccountId));

    return row?.balance ?? 0;
  }

  async getAdjustmentAnchorBalance(
    householdId: string,
    ledgerAccountId: string,
    postedDate: Date,
  ): Promise<number> {
    const [row] = await db
      .select({
        balance: sql<number>`coalesce(sum(${entriesTable.amount}), 0)`.mapWith(Number),
      })
      .from(entriesTable)
      .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
      .where(
        and(
          eq(entriesTable.ledgerAccountId, ledgerAccountId),
          eq(transactionsTable.householdId, householdId),
          or(
            lt(transactionsTable.postedDate, postedDate),
            and(
              eq(transactionsTable.postedDate, postedDate),
              eq(transactionsTable.type, 'adjustment'),
            ),
          ),
        ),
      );

    return row?.balance ?? 0;
  }

  async deleteByOwner(tx: TxClient, ownerType: LedgerOwnerType, ownerId: string): Promise<void> {
    await tx
      .delete(ledgerAccountsTable)
      .where(
        and(eq(ledgerAccountsTable.ownerType, ownerType), eq(ledgerAccountsTable.ownerId, ownerId)),
      );
  }
}

export const ledgerAccountsRepository = new LedgerAccountsRepository();
