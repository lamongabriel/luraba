import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { budgetsTable } from '@/db/schemas/budgets.schema';
import { categoriesTable } from '@/db/schemas/categories.schema';
import { creditCardBudgetRecognitionsTable } from '@/db/schemas/credit-card-budget-recognitions.schema';
import { creditCardPurchasesTable } from '@/db/schemas/credit-card-purchases.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import { usersTable } from '@/db/schemas/users.schema';

export type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function findUserBudgetContext(userId: string): Promise<{
  id: string;
  preferredCurrency: string;
} | undefined> {
  const rows = await db
    .select({
      id: usersTable.id,
      preferredCurrency: usersTable.preferredCurrency,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  return rows[0];
}

export async function findCurrencyByCode(currencyCode: string): Promise<{ code: string } | undefined> {
  const rows = await db
    .select({ code: currenciesTable.code })
    .from(currenciesTable)
    .where(eq(currenciesTable.code, currencyCode));

  return rows[0];
}

export async function findOwnedCategoriesByIds(userId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      parentId: categoriesTable.parentId,
      type: categoriesTable.type,
    })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.userId, userId), inArray(categoriesTable.id, categoryIds)));
}

export async function listMonthBudgets(userId: string, month: Date, currencyCode: string) {
  return db
    .select({
      id: budgetsTable.id,
      categoryId: budgetsTable.categoryId,
      amount: budgetsTable.amount,
      categoryName: categoriesTable.name,
      parentId: categoriesTable.parentId,
      categoryType: categoriesTable.type,
    })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, budgetsTable.categoryId))
    .where(
      and(
        eq(budgetsTable.userId, userId),
        eq(budgetsTable.month, month),
        eq(budgetsTable.currencyId, currencyCode),
      ),
    )
    .orderBy(asc(categoriesTable.type), asc(categoriesTable.name));
}

export async function listMonthActuals(userId: string, month: Date, currencyCode: string) {
  return db
    .select({
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      parentId: categoriesTable.parentId,
      categoryType: categoriesTable.type,
      actualAmount: sql<number>`coalesce(sum(abs(${entriesTable.amount})), 0)::integer`,
    })
    .from(entriesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .innerJoin(categoriesTable, eq(categoriesTable.id, transactionsTable.categoryId))
    .where(
      and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.includeInBudget, true),
        eq(ledgerAccountsTable.ownerType, 'account'),
        eq(entriesTable.currencyId, currencyCode),
        eq(entriesTable.budgetMonth, month),
      ),
    )
    .groupBy(transactionsTable.categoryId, categoriesTable.name, categoriesTable.parentId, categoriesTable.type)
    .orderBy(asc(categoriesTable.type), asc(categoriesTable.name));
}

export async function listMonthCreditCardActuals(userId: string, month: Date, currencyCode: string) {
  return db
    .select({
      categoryId: creditCardBudgetRecognitionsTable.categoryId,
      categoryName: categoriesTable.name,
      parentId: categoriesTable.parentId,
      categoryType: categoriesTable.type,
      actualAmount: sql<number>`coalesce(sum(${creditCardBudgetRecognitionsTable.amount}), 0)::integer`,
    })
    .from(creditCardBudgetRecognitionsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, creditCardBudgetRecognitionsTable.categoryId))
    .innerJoin(creditCardPurchasesTable, eq(creditCardPurchasesTable.id, creditCardBudgetRecognitionsTable.purchaseId))
    .innerJoin(creditCardsTable, eq(creditCardsTable.id, creditCardPurchasesTable.creditCardId))
    .where(
      and(
        eq(creditCardsTable.userId, userId),
        eq(creditCardBudgetRecognitionsTable.currencyId, currencyCode),
        eq(creditCardBudgetRecognitionsTable.budgetMonth, month),
      ),
    )
    .groupBy(
      creditCardBudgetRecognitionsTable.categoryId,
      categoriesTable.name,
      categoriesTable.parentId,
      categoriesTable.type,
    )
    .orderBy(asc(categoriesTable.type), asc(categoriesTable.name));
}

export async function replaceMonthBudgets(
  tx: TxClient,
  userId: string,
  month: Date,
  currencyCode: string,
  values: Array<{
    categoryId: string;
    amount: number;
  }>,
): Promise<void> {
  await tx
    .delete(budgetsTable)
    .where(and(eq(budgetsTable.userId, userId), eq(budgetsTable.month, month), eq(budgetsTable.currencyId, currencyCode)));

  if (values.length === 0) {
    return;
  }

  await tx.insert(budgetsTable).values(
    values.map((value) => ({
      userId,
      month,
      currencyId: currencyCode,
      categoryId: value.categoryId,
      amount: value.amount,
    })),
  );
}
