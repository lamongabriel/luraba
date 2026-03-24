import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { Account, CreateAccountDto } from './accounts.types';

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

export async function findByUserAndName(userId: number, name: string): Promise<Account | undefined> {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.userId, userId), eq(accountsTable.name, name)));
  return rows[0];
}

export async function createAccount(userId: number, dto: CreateAccountDto): Promise<Account> {
  const rows = await db
    .insert(accountsTable)
    .values({
      ...dto,
      userId,
    })
    .returning();
  return rows[0];
}

export async function listByUserId(userId: number): Promise<Account[]> {
  return db.select().from(accountsTable).where(eq(accountsTable.userId, userId));
}