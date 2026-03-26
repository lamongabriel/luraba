import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { categoriesTable } from '@/db/schemas/categories.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';

export type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000000';

export async function findUserById(userId: string): Promise<{ id: string } | undefined> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  return rows[0];
}

export async function findCurrencyByCode(currencyCode: string): Promise<{ code: string } | undefined> {
  const rows = await db
    .select({ code: currenciesTable.code })
    .from(currenciesTable)
    .where(eq(currenciesTable.code, currencyCode));

  return rows[0];
}

export async function findPaymentMethodByCode(
  paymentMethodCode: string,
  currencyCode: string,
): Promise<{
  id: string;
  code: string;
  name: string;
  currencyCode: string | null;
} | undefined> {
  const rows = await db
    .select({
      id: paymentMethodsTable.id,
      code: paymentMethodsTable.code,
      name: paymentMethodsTable.name,
      currencyCode: paymentMethodsTable.currencyId,
    })
    .from(paymentMethodsTable)
    .where(
      and(
        eq(paymentMethodsTable.code, paymentMethodCode),
        or(isNull(paymentMethodsTable.currencyId), eq(paymentMethodsTable.currencyId, currencyCode)),
      ),
    )
    .orderBy(sql`case when ${paymentMethodsTable.currencyId} = ${currencyCode} then 0 else 1 end`, asc(paymentMethodsTable.code));

  return rows[0];
}

export async function findOwnedMerchant(merchantId: string, userId: string): Promise<{ id: string } | undefined> {
  const rows = await db
    .select({ id: merchantsTable.id })
    .from(merchantsTable)
    .where(and(eq(merchantsTable.id, merchantId), eq(merchantsTable.userId, userId)));

  return rows[0];
}

export async function findOwnedCategory(
  categoryId: string,
  userId: string,
): Promise<{ id: string; type: 'expense' | 'income' } | undefined> {
  const rows = await db
    .select({
      id: categoriesTable.id,
      type: categoriesTable.type,
    })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)));

  return rows[0];
}

export async function findOwnedAccount(
  accountId: string,
  userId: string,
): Promise<(typeof accountsTable.$inferSelect) | undefined> {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)));

  return rows[0];
}

export async function findLedgerAccountByOwner(
  ownerType: 'account' | 'system',
  ownerId: string,
): Promise<{
  id: string;
  classification: 'asset' | 'liability';
  currencyId: string;
  systemKey: string | null;
} | undefined> {
  const rows = await db
    .select({
      id: ledgerAccountsTable.id,
      classification: ledgerAccountsTable.classification,
      currencyId: ledgerAccountsTable.currencyId,
      systemKey: ledgerAccountsTable.systemKey,
    })
    .from(ledgerAccountsTable)
    .where(and(eq(ledgerAccountsTable.ownerType, ownerType), eq(ledgerAccountsTable.ownerId, ownerId)));

  return rows[0];
}

export async function findOrCreateSystemLedger(
  tx: TxClient,
  key: string,
  classification: 'asset' | 'liability',
  currencyCode: string,
): Promise<{ id: string; classification: 'asset' | 'liability'; currencyId: string }> {
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

export async function listDetailedByUserId(userId: string) {
  return db
    .select({
      transactionId: transactionsTable.id,
      userId: transactionsTable.userId,
      type: transactionsTable.type,
      description: transactionsTable.description,
      isExcluded: transactionsTable.isExcluded,
      isOneTimeTransaction: transactionsTable.isOneTimeTransaction,
      merchantId: transactionsTable.merchantId,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
      createdAt: transactionsTable.createdAt,
      updatedAt: transactionsTable.updatedAt,
      paymentMethodId: transactionsTable.paymentMethodId,
      paymentMethodCode: paymentMethodsTable.code,
      paymentMethodName: paymentMethodsTable.name,
      entryId: entriesTable.id,
      entryAmount: entriesTable.amount,
      entryCurrencyCode: entriesTable.currencyId,
      categoryId: entriesTable.categoryId,
      ownerType: ledgerAccountsTable.ownerType,
      ownerId: ledgerAccountsTable.ownerId,
      ledgerClassification: ledgerAccountsTable.classification,
      accountId: accountsTable.id,
      accountName: accountsTable.name,
      accountClassification: accountsTable.classification,
    })
    .from(transactionsTable)
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .leftJoin(accountsTable, and(eq(accountsTable.id, ledgerAccountsTable.ownerId), eq(ledgerAccountsTable.ownerType, 'account')))
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .where(eq(transactionsTable.userId, userId))
    .orderBy(
      desc(transactionsTable.postedDate),
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
      desc(entriesTable.id),
    );
}

export async function listDetailedByTransactionIds(userId: string, transactionIds: string[]) {
  if (transactionIds.length === 0) {
    return [];
  }

  return db
    .select({
      transactionId: transactionsTable.id,
      userId: transactionsTable.userId,
      type: transactionsTable.type,
      description: transactionsTable.description,
      isExcluded: transactionsTable.isExcluded,
      isOneTimeTransaction: transactionsTable.isOneTimeTransaction,
      merchantId: transactionsTable.merchantId,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
      createdAt: transactionsTable.createdAt,
      updatedAt: transactionsTable.updatedAt,
      paymentMethodId: transactionsTable.paymentMethodId,
      paymentMethodCode: paymentMethodsTable.code,
      paymentMethodName: paymentMethodsTable.name,
      entryId: entriesTable.id,
      entryAmount: entriesTable.amount,
      entryCurrencyCode: entriesTable.currencyId,
      categoryId: entriesTable.categoryId,
      ownerType: ledgerAccountsTable.ownerType,
      ownerId: ledgerAccountsTable.ownerId,
      ledgerClassification: ledgerAccountsTable.classification,
      accountId: accountsTable.id,
      accountName: accountsTable.name,
      accountClassification: accountsTable.classification,
    })
    .from(transactionsTable)
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .leftJoin(accountsTable, and(eq(accountsTable.id, ledgerAccountsTable.ownerId), eq(ledgerAccountsTable.ownerType, 'account')))
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .where(and(eq(transactionsTable.userId, userId), inArray(transactionsTable.id, transactionIds)))
    .orderBy(
      desc(transactionsTable.postedDate),
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
      desc(entriesTable.id),
    );
}
