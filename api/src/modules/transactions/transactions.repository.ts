import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { billingCyclesTable } from '@/db/schemas/billing-cycles.schema';
import { cardPaymentsTable } from '@/db/schemas/card-payments.schema';
import { categoriesTable } from '@/db/schemas/categories.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { installmentItemsTable } from '@/db/schemas/installment-items.schema';
import { installmentsTable } from '@/db/schemas/installments.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { merchantsTable } from '@/db/schemas/merchants.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { TransactionListItem } from './transactions.types';

export type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000000';

export async function findUserById(userId: string): Promise<{ id: string; budgetMonthStartsOn: number } | undefined> {
  const rows = await db
    .select({
      id: usersTable.id,
      budgetMonthStartsOn: usersTable.budgetMonthStartsOn,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  return rows[0];
}

export async function findCurrencyById(currencyId: string): Promise<{ id: string } | undefined> {
  const rows = await db
    .select({ id: currenciesTable.id })
    .from(currenciesTable)
    .where(eq(currenciesTable.id, currencyId));

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

export async function findOwnedCreditCard(
  cardId: string,
  userId: string,
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

export async function findLedgerAccountByOwner(
  ownerType: 'account' | 'credit_card',
  ownerId: string,
): Promise<{
  id: string;
  type: 'asset' | 'liability' | 'expense' | 'income' | 'equity';
  currencyId: string;
} | undefined> {
  const rows = await db
    .select({
      id: ledgerAccountsTable.id,
      type: ledgerAccountsTable.type,
      currencyId: ledgerAccountsTable.currencyId,
    })
    .from(ledgerAccountsTable)
    .where(and(eq(ledgerAccountsTable.ownerType, ownerType), eq(ledgerAccountsTable.ownerId, ownerId)));

  return rows[0];
}

export async function findOwnedBillingCycle(
  billingCycleId: string,
  userId: string,
): Promise<{
  id: string;
  creditCardId: string;
  startDate: Date;
  endDate: Date;
  closingDate: Date;
  dueDate: Date;
  status: 'future' | 'open' | 'closed' | 'due' | 'paid';
  cardCurrencyId: string;
  cardName: string;
} | undefined> {
  const rows = await db
    .select({
      id: billingCyclesTable.id,
      creditCardId: billingCyclesTable.creditCardId,
      startDate: billingCyclesTable.startDate,
      endDate: billingCyclesTable.endDate,
      closingDate: billingCyclesTable.closingDate,
      dueDate: billingCyclesTable.dueDate,
      status: billingCyclesTable.status,
      cardCurrencyId: creditCardsTable.currencyId,
      cardName: creditCardsTable.name,
    })
    .from(billingCyclesTable)
    .innerJoin(creditCardsTable, eq(creditCardsTable.id, billingCyclesTable.creditCardId))
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .where(and(eq(billingCyclesTable.id, billingCycleId), eq(accountsTable.userId, userId)));

  return rows[0];
}

export async function findCycleByPurchaseDate(
  cardId: string,
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

export async function listCyclesByCard(cardId: string): Promise<(typeof billingCyclesTable.$inferSelect)[]> {
  return db
    .select()
    .from(billingCyclesTable)
    .where(eq(billingCyclesTable.creditCardId, cardId))
    .orderBy(asc(billingCyclesTable.startDate));
}

export async function listCyclesByCardFromStart(
  cardId: string,
  startDate: Date,
): Promise<(typeof billingCyclesTable.$inferSelect)[]> {
  return db
    .select()
    .from(billingCyclesTable)
    .where(and(eq(billingCyclesTable.creditCardId, cardId), gte(billingCyclesTable.startDate, startDate)))
    .orderBy(asc(billingCyclesTable.startDate));
}

export async function listExistingCyclesByCard(
  cardId: string,
  startDate: Date,
  endDate: Date,
): Promise<(typeof billingCyclesTable.$inferSelect)[]> {
  return db
    .select()
    .from(billingCyclesTable)
    .where(
      and(
        eq(billingCyclesTable.creditCardId, cardId),
        gte(billingCyclesTable.startDate, startDate),
        lte(billingCyclesTable.startDate, endDate),
      ),
    )
    .orderBy(asc(billingCyclesTable.startDate));
}

export async function insertBillingCycles(
  tx: TxClient,
  values: Array<typeof billingCyclesTable.$inferInsert>,
): Promise<void> {
  if (values.length === 0) return;

  await tx.insert(billingCyclesTable).values(values).onConflictDoNothing();
}

export async function updateBillingCycleStatus(
  tx: TxClient,
  billingCycleId: string,
  status: 'future' | 'open' | 'closed' | 'due' | 'paid',
): Promise<void> {
  await tx
    .update(billingCyclesTable)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(billingCyclesTable.id, billingCycleId));
}

export async function findOrCreateSystemLedger(
  tx: TxClient,
  key: string,
  type: 'expense' | 'income' | 'equity',
  currencyId: string,
): Promise<{ id: string; type: 'expense' | 'income' | 'equity'; currencyId: string }> {
  const rows = await tx
    .select({
      id: ledgerAccountsTable.id,
      type: ledgerAccountsTable.type,
      currencyId: ledgerAccountsTable.currencyId,
    })
    .from(ledgerAccountsTable)
    .where(eq(ledgerAccountsTable.systemKey, key));

  if (rows[0]) {
    return rows[0] as { id: string; type: 'expense' | 'income' | 'equity'; currencyId: string };
  }

  const created = await tx
    .insert(ledgerAccountsTable)
    .values({
      type,
      ownerType: 'system',
      ownerId: SYSTEM_OWNER_ID,
      currencyId,
      systemKey: key,
    })
    .returning({
      id: ledgerAccountsTable.id,
      type: ledgerAccountsTable.type,
      currencyId: ledgerAccountsTable.currencyId,
    });

  return created[0] as { id: string; type: 'expense' | 'income' | 'equity'; currencyId: string };
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

export async function createInstallment(
  tx: TxClient,
  values: typeof installmentsTable.$inferInsert,
): Promise<typeof installmentsTable.$inferSelect> {
  const rows = await tx.insert(installmentsTable).values(values).returning();
  return rows[0];
}

export async function createInstallmentItems(
  tx: TxClient,
  values: Array<typeof installmentItemsTable.$inferInsert>,
): Promise<Array<typeof installmentItemsTable.$inferSelect>> {
  return tx.insert(installmentItemsTable).values(values).returning();
}

export async function createCardPayment(
  tx: TxClient,
  values: typeof cardPaymentsTable.$inferInsert,
): Promise<typeof cardPaymentsTable.$inferSelect> {
  const rows = await tx.insert(cardPaymentsTable).values(values).returning();
  return rows[0];
}

export async function listByUserId(userId: string): Promise<TransactionListItem[]> {
  return db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      type: transactionsTable.type,
      paymentMethod: transactionsTable.paymentMethod,
      description: transactionsTable.description,
      isExcluded: transactionsTable.isExcluded,
      isOneTimeTransaction: transactionsTable.isOneTimeTransaction,
      merchantId: transactionsTable.merchantId,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
      createdAt: transactionsTable.createdAt,
      updatedAt: transactionsTable.updatedAt,
      amount: sql<bigint>`coalesce(sum(case when ${entriesTable.amount} > 0 then ${entriesTable.amount} else 0 end), 0)::bigint`,
      currencyId: entriesTable.currencyId,
    })
    .from(transactionsTable)
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .where(eq(transactionsTable.userId, userId))
    .groupBy(
      transactionsTable.id,
      transactionsTable.userId,
      transactionsTable.type,
      transactionsTable.paymentMethod,
      transactionsTable.description,
      transactionsTable.isExcluded,
      transactionsTable.isOneTimeTransaction,
      transactionsTable.merchantId,
      transactionsTable.purchaseDate,
      transactionsTable.postedDate,
      transactionsTable.createdAt,
      transactionsTable.updatedAt,
      entriesTable.currencyId,
    )
    .orderBy(desc(transactionsTable.postedDate), desc(transactionsTable.createdAt), desc(transactionsTable.id));
}
