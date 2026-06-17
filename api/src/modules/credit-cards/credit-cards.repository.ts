import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { NotFoundError } from '@/shared/errors';
import {
  type CreditCardRow,
  type CreditCardSelectRow,
  creditCardSelect,
  toCreditCardRow,
} from './credit-cards.helpers';

export async function findById(
  householdId: string,
  creditCardId: string,
): Promise<CreditCardRow | undefined> {
  const rows = await db
    .select(creditCardSelect)
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .where(
      and(eq(creditCardsTable.id, creditCardId), eq(creditCardsTable.householdId, householdId)),
    )
    .limit(1);

  const row = rows[0] as CreditCardSelectRow | undefined;
  return row ? toCreditCardRow(row) : undefined;
}

export async function listByHouseholdId(householdId: string): Promise<CreditCardRow[]> {
  const rows = await db
    .select(creditCardSelect)
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .where(eq(creditCardsTable.householdId, householdId))
    .orderBy(asc(accountsTable.name));

  return rows.map((row) => toCreditCardRow(row as CreditCardSelectRow));
}

export async function findByIdOrThrow(
  householdId: string,
  creditCardId: string,
): Promise<CreditCardRow> {
  const card = await findById(householdId, creditCardId);
  if (!card) {
    throw new NotFoundError('Credit card');
  }

  return card;
}
