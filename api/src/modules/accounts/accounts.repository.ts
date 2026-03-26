import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { AccountRecord, CreateAccountDto } from './accounts.types';

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

export async function findByUserAndName(userId: string, name: string): Promise<AccountRecord | undefined> {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.userId, userId), eq(accountsTable.name, name)));
  return rows[0];
}

export async function findOwnedAccount(accountId: string, userId: string): Promise<AccountRecord | undefined> {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)));

  return rows[0];
}

export async function createAccount(userId: string, dto: CreateAccountDto): Promise<AccountRecord> {
  const rows = await db
    .insert(accountsTable)
    .values({
      userId,
      name: dto.name,
      institutionName: dto.institutionName,
      institutionDomain: dto.institutionDomain,
      notes: dto.notes,
      classification: dto.classification,
      type: dto.type,
      currencyId: dto.currencyCode,
    })
    .returning();
  return rows[0];
}

export async function listByUserId(userId: string): Promise<AccountRecord[]> {
  return db.select().from(accountsTable).where(eq(accountsTable.userId, userId)).orderBy(asc(accountsTable.name));
}

export async function findLedgerByAccountId(accountId: string): Promise<{
  id: string;
  classification: 'asset' | 'liability';
  currencyId: string;
} | undefined> {
  const rows = await db
    .select({
      id: ledgerAccountsTable.id,
      classification: ledgerAccountsTable.classification,
      currencyId: ledgerAccountsTable.currencyId,
    })
    .from(ledgerAccountsTable)
    .where(and(eq(ledgerAccountsTable.ownerType, 'account'), eq(ledgerAccountsTable.ownerId, accountId)));

  return rows[0];
}

export async function getAccountBalanceByLedgerId(ledgerAccountId: string): Promise<bigint> {
  const [row] = await db
    .select({
      balance: sql<bigint>`coalesce(sum(${entriesTable.amount}), 0)::bigint`,
    })
    .from(entriesTable)
    .where(eq(entriesTable.ledgerAccountId, ledgerAccountId));

  return row?.balance ?? 0n;
}

export async function listHistoryByLedgerId(ledgerAccountId: string): Promise<
  Array<{
    entryId: string;
    transactionId: string;
    rawAmount: bigint;
    currencyCode: string;
    type: 'expense' | 'income' | 'transfer' | 'adjustment';
    paymentMethodId: string | null;
    paymentMethodCode: string | null;
    paymentMethodName: string | null;
    description: string;
    merchantId: string | null;
    categoryId: string | null;
    purchaseDate: Date;
    postedDate: Date;
    createdAt: Date;
  }>
> {
  return db
    .select({
      entryId: entriesTable.id,
      transactionId: transactionsTable.id,
      rawAmount: entriesTable.amount,
      currencyCode: entriesTable.currencyId,
      type: transactionsTable.type,
      paymentMethodId: transactionsTable.paymentMethodId,
      paymentMethodCode: paymentMethodsTable.code,
      paymentMethodName: paymentMethodsTable.name,
      description: transactionsTable.description,
      merchantId: transactionsTable.merchantId,
      categoryId: entriesTable.categoryId,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
      createdAt: transactionsTable.createdAt,
    })
    .from(entriesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .where(eq(entriesTable.ledgerAccountId, ledgerAccountId))
    .orderBy(
      desc(transactionsTable.postedDate),
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
      desc(entriesTable.id),
    );
}
