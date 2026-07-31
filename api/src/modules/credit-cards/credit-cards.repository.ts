import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { buildAccountBalanceSubquery } from '@/modules/ledger-accounts/ledger-accounts.repository';
import { NotFoundError } from '@/shared/errors';
import { type DbListPage, getPagination } from '@/shared/list';
import {
  type CreditCardRow,
  type CreditCardSelectRow,
  creditCardSelect,
  toCreditCardRow,
} from './credit-cards.helpers';
import {
  buildCreditCardsListOrder,
  buildCreditCardsListWhere,
  type ListCreditCardsRequestQuery,
} from './credit-cards.query';

export type CreditCardListRow = CreditCardRow & {
  balance: number;
};

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

export async function listPage(
  householdId: string,
  query: ListCreditCardsRequestQuery,
): Promise<DbListPage<CreditCardListRow>> {
  const { limit, offset } = getPagination(query);
  const accountBalances = buildAccountBalanceSubquery();
  const rawBalance = sql<number>`coalesce(${accountBalances.balance}, 0)::integer`;
  const displayedBalance = sql<number>`(-${rawBalance})::integer`;
  const whereCondition = buildCreditCardsListWhere(householdId, query, displayedBalance);
  const orderBy = buildCreditCardsListOrder(query, displayedBalance);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::integer` })
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .leftJoin(accountBalances, eq(accountBalances.accountId, creditCardsTable.accountId))
    .where(whereCondition);

  const rows = await db
    .select({
      ...creditCardSelect,
      balance: displayedBalance.mapWith(Number),
    })
    .from(creditCardsTable)
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .leftJoin(accountBalances, eq(accountBalances.accountId, creditCardsTable.accountId))
    .where(whereCondition)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return {
    rows: rows.map((row) => ({
      ...toCreditCardRow(row as CreditCardSelectRow),
      balance: Number(row.balance),
    })),
    totalCount: countRow?.count ?? 0,
  };
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
