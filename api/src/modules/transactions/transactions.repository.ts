import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function findUserById(userId: number): Promise<{ id: number } | undefined> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  return rows[0];
}

export async function findCurrencyById(currencyId: number): Promise<{ id: number } | undefined> {
  const rows = await db
    .select({ id: currenciesTable.id })
    .from(currenciesTable)
    .where(eq(currenciesTable.id, currencyId));
  return rows[0];
}

export async function findOwnedMerchant(merchantId: number, userId: number): Promise<{ id: number } | undefined> {
  const rows = await db
    .select({ id: merchantsTable.id })
    .from(merchantsTable)
    .where(and(eq(merchantsTable.id, merchantId), eq(merchantsTable.userId, userId)));
  return rows[0];
}

export async function findOwnedAccount(
  accountId: number,
  userId: number,
): Promise<(typeof accountsTable.$inferSelect) | undefined> {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)));

  return rows[0];
}

export async function findOwnedCreditCard(
  cardId: number,
  userId: number,
): Promise<(typeof creditCardsTable.$inferSelect) | undefined> {
  const rows = await db
    .select({
      id: creditCardsTable.id,
      accountId: creditCardsTable.accountId,
      name: creditCardsTable.name,
      brand: creditCardsTable.brand,
      last4: creditCardsTable.last4,
      limitAmount: creditCardsTable.limitAmount,
      currencyId: creditCardsTable.currencyId,
      closingDay: creditCardsTable.closingDay,
      dueDay: creditCardsTable.dueDay,
      graceDays: creditCardsTable.graceDays,
      createdAt: creditCardsTable.createdAt,
      updatedAt: creditCardsTable.updatedAt,
    })
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .where(and(eq(creditCardsTable.id, cardId), eq(accountsTable.userId, userId)));

  return rows[0];
}

export async function findLedgerAccountByOwner(ownerType: 'account' | 'credit_card', ownerId: number): Promise<{
  id: number;
  currencyId: number;
} | undefined> {
  const rows = await db
    .select({ id: ledgerAccountsTable.id, currencyId: ledgerAccountsTable.currencyId })
    .from(ledgerAccountsTable)
    .where(and(eq(ledgerAccountsTable.ownerType, ownerType), eq(ledgerAccountsTable.ownerId, ownerId)));

  return rows[0];
}

export async function findCycleByPurchaseDate(
  cardId: number,
  purchaseDate: Date,
): Promise<(typeof billingCyclesTable.$inferSelect) | undefined> {
  const rows = await db
    .select()
    .from(billingCyclesTable)
    .where(
      and(
        eq(billingCyclesTable.creditCardId, cardId),
        lte(billingCyclesTable.startDate, purchaseDate),
        gte(billingCyclesTable.endDate, purchaseDate),
      ),
    )
    .orderBy(asc(billingCyclesTable.startDate));

  return rows[0];
}

export async function findOrCreateSystemLedger(
  tx: TxClient,
  key: string,
  type: 'expense' | 'income',
  currencyId: number,
): Promise<{ id: number; currencyId: number }> {
  const rows = await tx
    .select({ id: ledgerAccountsTable.id, currencyId: ledgerAccountsTable.currencyId })
    .from(ledgerAccountsTable)
    .where(eq(ledgerAccountsTable.systemKey, key));

  if (rows[0]) return rows[0];

  const created = await tx
    .insert(ledgerAccountsTable)
    .values({
      type,
      ownerType: 'system',
      ownerId: 0,
      currencyId,
      systemKey: key,
    })
    .returning({ id: ledgerAccountsTable.id, currencyId: ledgerAccountsTable.currencyId });

  return created[0];
}

export async function createTransaction(
  tx: TxClient,
  values: typeof transactionsTable.$inferInsert,
): Promise<typeof transactionsTable.$inferSelect> {
  const rows = await tx.insert(transactionsTable).values(values).returning();
  return rows[0];
}

export async function createEntries(
  tx: TxClient,
  values: Array<typeof entriesTable.$inferInsert>,
): Promise<Array<typeof entriesTable.$inferSelect>> {
  return tx.insert(entriesTable).values(values).returning();
}

export async function listByUserId(userId: number): Promise<Array<typeof transactionsTable.$inferSelect>> {
  return db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
}