import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { CreditCard, CreateCreditCardDto } from './credit-cards.types';

export async function findUserById(userId: string): Promise<{ id: string } | undefined> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  return rows[0];
}

export async function findCurrencyById(currencyId: string): Promise<{ id: string } | undefined> {
  const rows = await db
    .select({ id: currenciesTable.id })
    .from(currenciesTable)
    .where(eq(currenciesTable.id, currencyId));
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

export async function createCreditCard(dto: CreateCreditCardDto): Promise<CreditCard> {
  const rows = await db
    .insert(creditCardsTable)
    .values({
      accountId: dto.accountId,
      name: dto.name,
      brand: dto.brand,
      last4: dto.last4,
      limitAmount: dto.limitAmount,
      currencyId: dto.currencyId,
      closingDay: dto.closingDay,
      dueDay: dto.dueDay,
      graceDays: dto.graceDays,
    })
    .returning();

  return rows[0];
}

export async function findOwnedCreditCard(
  cardId: string,
  userId: string,
): Promise<CreditCard | undefined> {
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

export async function listCyclesByCard(cardId: string): Promise<(typeof billingCyclesTable.$inferSelect)[]> {
  return db
    .select()
    .from(billingCyclesTable)
    .where(eq(billingCyclesTable.creditCardId, cardId))
    .orderBy(asc(billingCyclesTable.startDate));
}
