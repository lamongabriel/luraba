import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { cardPaymentsTable } from '@/db/schemas/card-payments.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { Account, CreateAccountDto } from './accounts.types';

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

export async function findByUserAndName(userId: string, name: string): Promise<Account | undefined> {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.userId, userId), eq(accountsTable.name, name)));
  return rows[0];
}

export async function findOwnedAccount(accountId: string, userId: string): Promise<Account | undefined> {
  const rows = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)));

  return rows[0];
}

export async function createAccount(userId: string, dto: CreateAccountDto): Promise<Account> {
  const rows = await db
    .insert(accountsTable)
    .values({
      ...dto,
      userId,
    })
    .returning();
  return rows[0];
}

export async function listByUserId(userId: string): Promise<Account[]> {
  return db.select().from(accountsTable).where(eq(accountsTable.userId, userId));
}

export async function findLedgerByAccountId(accountId: string): Promise<{
  id: string;
  currencyId: string;
} | undefined> {
  const rows = await db
    .select({
      id: ledgerAccountsTable.id,
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
    amount: bigint;
    currencyId: string;
    billingCycleId: string | null;
    type: 'expense' | 'income' | 'transfer' | 'card_purchase' | 'card_payment' | 'installment' | 'adjustment';
    paymentMethod: 'cash' | 'debit' | 'pix' | 'boleto' | 'credit_card' | null;
    description: string;
    purchaseDate: Date;
    postedDate: Date;
    createdAt: Date;
  }>
> {
  return db
    .select({
      entryId: entriesTable.id,
      transactionId: transactionsTable.id,
      amount: entriesTable.amount,
      currencyId: entriesTable.currencyId,
      billingCycleId: entriesTable.billingCycleId,
      type: transactionsTable.type,
      paymentMethod: transactionsTable.paymentMethod,
      description: transactionsTable.description,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
      createdAt: transactionsTable.createdAt,
    })
    .from(entriesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
    .where(eq(entriesTable.ledgerAccountId, ledgerAccountId))
    .orderBy(
      desc(transactionsTable.postedDate),
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
      desc(entriesTable.id),
    );
}

export async function listCardPaymentsByTransactionIds(transactionIds: string[]): Promise<
  Array<{
    transactionId: string;
    amount: bigint;
    billingCycleId: string;
    closingDate: Date;
    dueDate: Date;
    cardId: string;
    cardName: string;
  }>
> {
  if (transactionIds.length === 0) {
    return [];
  }

  return db
    .select({
      transactionId: cardPaymentsTable.transactionId,
      amount: cardPaymentsTable.amount,
      billingCycleId: cardPaymentsTable.billingCycleId,
      closingDate: billingCyclesTable.closingDate,
      dueDate: billingCyclesTable.dueDate,
      cardId: creditCardsTable.id,
      cardName: creditCardsTable.name,
    })
    .from(cardPaymentsTable)
    .innerJoin(billingCyclesTable, eq(billingCyclesTable.id, cardPaymentsTable.billingCycleId))
    .innerJoin(creditCardsTable, eq(creditCardsTable.id, billingCyclesTable.creditCardId))
    .where(inArray(cardPaymentsTable.transactionId, transactionIds));
}
