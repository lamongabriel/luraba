import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { creditCardBillingCyclesTable } from '@/db/schemas/credit-card-billing-cycles.schema';
import { creditCardInstallmentsTable } from '@/db/schemas/credit-card-installments.schema';
import { creditCardPurchasesTable } from '@/db/schemas/credit-card-purchases.schema';
import { creditCardsTable } from '@/db/schemas/credit-cards.schema';
import { entriesTable } from '@/db/schemas/entries.schema';
import { ledgerAccountsTable } from '@/db/schemas/ledger-accounts.schema';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import { tagsTable } from '@/db/schemas/tags.schema';
import { transactionTagsTable } from '@/db/schemas/transaction-tags.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import type { TxClient } from '@/db/types';
import { now } from '@/shared/lib/date';

const transactionDetailSelect = {
  transactionId: transactionsTable.id,
  type: transactionsTable.type,
  description: transactionsTable.description,
  includeInBudget: transactionsTable.includeInBudget,
  merchantId: transactionsTable.merchantId,
  purchaseDate: transactionsTable.purchaseDate,
  postedDate: transactionsTable.postedDate,
  createdAt: transactionsTable.createdAt,
  updatedAt: transactionsTable.updatedAt,
  paymentMethodId: transactionsTable.paymentMethodId,
  paymentMethodCode: paymentMethodsTable.code,
  paymentMethodName: paymentMethodsTable.name,
  paymentMethodScope: paymentMethodsTable.householdId,
  paymentMethodTranslationKey: paymentMethodsTable.translationKey,
  tagId: tagsTable.id,
  tagName: tagsTable.name,
  tagColor: tagsTable.color,
  tagIcon: tagsTable.icon,
  entryId: entriesTable.id,
  entryAmount: entriesTable.amount,
  entryCurrencyCode: entriesTable.currencyId,
  categoryId: transactionsTable.categoryId,
  ownerType: ledgerAccountsTable.ownerType,
  ownerId: ledgerAccountsTable.ownerId,
  ledgerClassification: ledgerAccountsTable.classification,
  accountId: accountsTable.id,
  accountName: accountsTable.name,
  accountClassification: accountsTable.classification,
} as const;

const creditCardInstallmentFeedSelect = {
  transactionId: transactionsTable.id,
  creditCardId: creditCardsTable.id,
  purchaseId: creditCardPurchasesTable.id,
  installmentId: creditCardInstallmentsTable.id,
  installmentNumber: creditCardInstallmentsTable.installmentNumber,
  installmentCount: creditCardPurchasesTable.installmentCount,
  description: transactionsTable.description,
  includeInBudget: transactionsTable.includeInBudget,
  merchantId: transactionsTable.merchantId,
  purchaseDate: transactionsTable.purchaseDate,
  postedDate: creditCardBillingCyclesTable.closingDate,
  createdAt: creditCardInstallmentsTable.createdAt,
  updatedAt: transactionsTable.updatedAt,
  paymentMethodId: transactionsTable.paymentMethodId,
  paymentMethodCode: paymentMethodsTable.code,
  paymentMethodName: paymentMethodsTable.name,
  paymentMethodScope: paymentMethodsTable.householdId,
  paymentMethodTranslationKey: paymentMethodsTable.translationKey,
  tagId: tagsTable.id,
  tagName: tagsTable.name,
  tagColor: tagsTable.color,
  tagIcon: tagsTable.icon,
  amount: creditCardInstallmentsTable.amount,
  currencyCode: accountsTable.currencyId,
  categoryId: transactionsTable.categoryId,
  accountId: accountsTable.id,
  accountName: accountsTable.name,
  accountClassification: accountsTable.classification,
} as const;

export async function createTransaction(
  tx: TxClient,
  values: typeof transactionsTable.$inferInsert,
): Promise<typeof transactionsTable.$inferSelect> {
  const rows = await tx.insert(transactionsTable).values(values).returning();
  return rows[0];
}

export async function createTransactionTags(
  tx: TxClient,
  values: Array<typeof transactionTagsTable.$inferInsert>,
): Promise<Array<typeof transactionTagsTable.$inferSelect>> {
  if (values.length === 0) {
    return [];
  }

  return tx.insert(transactionTagsTable).values(values).returning();
}

export async function deleteTransactionTags(tx: TxClient, transactionId: string): Promise<void> {
  await tx
    .delete(transactionTagsTable)
    .where(eq(transactionTagsTable.transactionId, transactionId));
}

export async function updateTransaction(
  tx: TxClient,
  householdId: string,
  transactionId: string,
  values: Partial<
    Pick<
      typeof transactionsTable.$inferInsert,
      | 'description'
      | 'purchaseDate'
      | 'postedDate'
      | 'includeInBudget'
      | 'paymentMethodId'
      | 'categoryId'
      | 'merchantId'
    >
  >,
): Promise<typeof transactionsTable.$inferSelect | undefined> {
  const rows = await tx
    .update(transactionsTable)
    .set({
      ...values,
      updatedAt: now(),
    })
    .where(
      and(eq(transactionsTable.id, transactionId), eq(transactionsTable.householdId, householdId)),
    )
    .returning();

  return rows[0];
}

export async function deleteTransaction(
  householdId: string,
  transactionId: string,
): Promise<typeof transactionsTable.$inferSelect | undefined> {
  const rows = await db
    .delete(transactionsTable)
    .where(
      and(eq(transactionsTable.id, transactionId), eq(transactionsTable.householdId, householdId)),
    )
    .returning();

  return rows[0];
}

export async function deleteTransactionInTransaction(
  tx: TxClient,
  householdId: string,
  transactionId: string,
): Promise<typeof transactionsTable.$inferSelect | undefined> {
  const rows = await tx
    .delete(transactionsTable)
    .where(
      and(eq(transactionsTable.id, transactionId), eq(transactionsTable.householdId, householdId)),
    )
    .returning();

  return rows[0];
}

export async function deleteByLedgerId(
  tx: TxClient,
  householdId: string,
  ledgerAccountId: string,
): Promise<void> {
  const transactionRows = await tx
    .select({ id: entriesTable.transactionId })
    .from(entriesTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, entriesTable.transactionId))
    .where(
      and(
        eq(entriesTable.ledgerAccountId, ledgerAccountId),
        eq(transactionsTable.householdId, householdId),
      ),
    );

  const transactionIds = Array.from(new Set(transactionRows.map((row) => row.id)));
  if (transactionIds.length === 0) {
    return;
  }

  await tx
    .delete(transactionsTable)
    .where(
      and(
        eq(transactionsTable.householdId, householdId),
        inArray(transactionsTable.id, transactionIds),
      ),
    );
}

export async function hasPaymentMethod(
  context: HouseholdContext,
  paymentMethodId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::integer` })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.householdId, context.householdId),
        eq(transactionsTable.paymentMethodId, paymentMethodId),
      ),
    );

  return (row?.count ?? 0) > 0;
}

export async function listDetailedByHouseholdId(householdId: string) {
  return db
    .select(transactionDetailSelect)
    .from(transactionsTable)
    .leftJoin(
      creditCardPurchasesTable,
      eq(creditCardPurchasesTable.transactionId, transactionsTable.id),
    )
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .leftJoin(
      accountsTable,
      and(
        eq(accountsTable.id, ledgerAccountsTable.ownerId),
        eq(ledgerAccountsTable.ownerType, 'account'),
      ),
    )
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .leftJoin(transactionTagsTable, eq(transactionTagsTable.transactionId, transactionsTable.id))
    .leftJoin(tagsTable, eq(tagsTable.id, transactionTagsTable.tagId))
    .where(and(eq(transactionsTable.householdId, householdId), isNull(creditCardPurchasesTable.id)))
    .orderBy(
      desc(transactionsTable.postedDate),
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
      desc(entriesTable.id),
    );
}

export async function listDetailedByTransactionIds(
  context: HouseholdContext,
  transactionIds: string[],
) {
  if (transactionIds.length === 0) {
    return [];
  }

  return db
    .select(transactionDetailSelect)
    .from(transactionsTable)
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .leftJoin(
      accountsTable,
      and(
        eq(accountsTable.id, ledgerAccountsTable.ownerId),
        eq(ledgerAccountsTable.ownerType, 'account'),
      ),
    )
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .leftJoin(transactionTagsTable, eq(transactionTagsTable.transactionId, transactionsTable.id))
    .leftJoin(tagsTable, eq(tagsTable.id, transactionTagsTable.tagId))
    .where(
      and(
        eq(transactionsTable.householdId, context.householdId),
        inArray(transactionsTable.id, transactionIds),
      ),
    )
    .orderBy(
      desc(transactionsTable.postedDate),
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
      desc(entriesTable.id),
    );
}

export async function listDetailedByAccountId(context: HouseholdContext, accountId: string) {
  const transactionRows = await db
    .select({
      id: transactionsTable.id,
      postedDate: transactionsTable.postedDate,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .innerJoin(ledgerAccountsTable, eq(ledgerAccountsTable.id, entriesTable.ledgerAccountId))
    .where(
      and(
        eq(transactionsTable.householdId, context.householdId),
        eq(ledgerAccountsTable.ownerType, 'account'),
        eq(ledgerAccountsTable.ownerId, accountId),
      ),
    )
    .groupBy(transactionsTable.id, transactionsTable.postedDate, transactionsTable.createdAt)
    .orderBy(
      desc(transactionsTable.postedDate),
      desc(transactionsTable.createdAt),
      desc(transactionsTable.id),
    );

  return listDetailedByTransactionIds(
    context,
    transactionRows.map((row) => row.id),
  );
}

export async function listCreditCardInstallmentFeedRows(householdId: string) {
  return db
    .select(creditCardInstallmentFeedSelect)
    .from(creditCardInstallmentsTable)
    .innerJoin(
      creditCardPurchasesTable,
      eq(creditCardPurchasesTable.id, creditCardInstallmentsTable.purchaseId),
    )
    .innerJoin(creditCardsTable, eq(creditCardsTable.id, creditCardInstallmentsTable.creditCardId))
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .innerJoin(
      creditCardBillingCyclesTable,
      eq(creditCardBillingCyclesTable.id, creditCardInstallmentsTable.billingCycleId),
    )
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.accountId))
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .leftJoin(transactionTagsTable, eq(transactionTagsTable.transactionId, transactionsTable.id))
    .leftJoin(tagsTable, eq(tagsTable.id, transactionTagsTable.tagId))
    .where(eq(transactionsTable.householdId, householdId))
    .orderBy(
      desc(creditCardBillingCyclesTable.closingDate),
      desc(creditCardInstallmentsTable.createdAt),
      desc(creditCardInstallmentsTable.id),
    );
}

export async function listCreditCardIdsByAccountIds(
  householdId: string,
  accountIds: string[],
): Promise<Array<{ accountId: string; creditCardId: string }>> {
  if (accountIds.length === 0) {
    return [];
  }

  return db
    .select({
      accountId: creditCardsTable.accountId,
      creditCardId: creditCardsTable.id,
    })
    .from(creditCardsTable)
    .where(
      and(
        eq(creditCardsTable.householdId, householdId),
        inArray(creditCardsTable.accountId, accountIds),
      ),
    );
}
