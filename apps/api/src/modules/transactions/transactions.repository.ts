import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { HouseholdContext } from '@/config/permissions';
import { db } from '@/db';
import { accountsTable } from '@/db/schemas/accounts.schema';
import { creditCardBillingCyclesTable } from '@/db/schemas/credit-card-billing-cycles.schema';
import { creditCardInstallmentsTable } from '@/db/schemas/credit-card-installments.schema';
import { creditCardPaymentsTable } from '@/db/schemas/credit-card-payments.schema';
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
import { type DbListPage, getPagination } from '@/shared/list';
import {
  buildTransactionFeedCte,
  buildTransactionFeedOrder,
  type ListTransactionsQuery,
} from './transactions.query';
import type { TransactionFeedRowKind, TransactionListSummary } from './transactions.types';

export type TransactionFeedPageKey = {
  rowId: string;
  rowKind: TransactionFeedRowKind;
  transactionId: string | null;
  installmentId: string | null;
};

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
  includeInBudget: creditCardPurchasesTable.includeInBudget,
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

export async function listTransactionFeedPageKeys(
  householdId: string,
  query: ListTransactionsQuery,
  options: { includeAdjustments?: boolean; maxPostedDate?: string } = {},
): Promise<DbListPage<TransactionFeedPageKey>> {
  const { limit, offset } = getPagination(query);
  const feedCte = buildTransactionFeedCte(householdId, query, options);
  const orderBy = buildTransactionFeedOrder(query);

  const summaryResult = await db.execute<{
    totalCount: number;
    incomeAmount: number;
    expenseAmount: number;
    transferCount: number;
  }>(sql`
    ${feedCte}
    select
      count(*)::integer as "totalCount",
      coalesce(sum(amount) filter (where origin_type = 'income'), 0)::integer as "incomeAmount",
      coalesce(sum(amount) filter (
        where origin_type = 'expense' and include_in_budget
      ), 0)::integer
      +
      coalesce(sum(amount) filter (
        where origin_type = 'credit_card_installment' and include_in_budget
      ), 0)::integer as "expenseAmount",
      count(*) filter (where origin_type = 'transfer')::integer as "transferCount"
    from filtered
  `);
  const rowsResult = await db.execute<TransactionFeedPageKey>(sql`
    ${feedCte}
    select
      row_id as "rowId",
      row_kind as "rowKind",
      transaction_id as "transactionId",
      installment_id as "installmentId"
    from filtered
    order by ${sql.join(orderBy, sql`, `)}
    limit ${limit}
    offset ${offset}
  `);
  const summaryRow = summaryResult.rows[0];
  const summary: TransactionListSummary = {
    totalCount: summaryRow?.totalCount ?? 0,
    incomeAmount: summaryRow?.incomeAmount ?? 0,
    expenseAmount: summaryRow?.expenseAmount ?? 0,
    transferCount: summaryRow?.transferCount ?? 0,
  };

  return {
    rows: rowsResult.rows,
    totalCount: summary.totalCount,
    summary,
  };
}

export async function createTransaction(
  tx: TxClient,
  values: typeof transactionsTable.$inferInsert,
): Promise<typeof transactionsTable.$inferSelect> {
  const rows = await tx.insert(transactionsTable).values(values).returning();
  return rows[0];
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
      asc(transactionTagsTable.position),
      asc(transactionTagsTable.tagId),
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
      asc(transactionTagsTable.position),
      asc(transactionTagsTable.tagId),
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
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.ledgerAccountId))
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .leftJoin(transactionTagsTable, eq(transactionTagsTable.transactionId, transactionsTable.id))
    .leftJoin(tagsTable, eq(tagsTable.id, transactionTagsTable.tagId))
    .where(eq(transactionsTable.householdId, householdId))
    .orderBy(
      desc(creditCardBillingCyclesTable.closingDate),
      desc(creditCardInstallmentsTable.createdAt),
      desc(creditCardInstallmentsTable.id),
      asc(transactionTagsTable.position),
      asc(transactionTagsTable.tagId),
    );
}

export async function listCreditCardInstallmentFeedRowsByIds(
  householdId: string,
  installmentIds: string[],
) {
  if (installmentIds.length === 0) {
    return [];
  }

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
    .innerJoin(accountsTable, eq(accountsTable.id, creditCardsTable.ledgerAccountId))
    .leftJoin(paymentMethodsTable, eq(paymentMethodsTable.id, transactionsTable.paymentMethodId))
    .leftJoin(transactionTagsTable, eq(transactionTagsTable.transactionId, transactionsTable.id))
    .leftJoin(tagsTable, eq(tagsTable.id, transactionTagsTable.tagId))
    .where(
      and(
        eq(transactionsTable.householdId, householdId),
        inArray(creditCardInstallmentsTable.id, installmentIds),
      ),
    )
    .orderBy(
      desc(creditCardBillingCyclesTable.closingDate),
      desc(creditCardInstallmentsTable.createdAt),
      desc(creditCardInstallmentsTable.id),
      asc(transactionTagsTable.position),
      asc(transactionTagsTable.tagId),
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
      accountId: creditCardsTable.ledgerAccountId,
      creditCardId: creditCardsTable.id,
    })
    .from(creditCardsTable)
    .where(
      and(
        eq(creditCardsTable.householdId, householdId),
        inArray(creditCardsTable.ledgerAccountId, accountIds),
      ),
    );
}

export async function listCreditCardPaymentMappingsByTransactionIds(
  householdId: string,
  transactionIds: string[],
): Promise<Array<{ transactionId: string; creditCardId: string; paymentId: string }>> {
  if (transactionIds.length === 0) {
    return [];
  }

  return db
    .select({
      transactionId: creditCardPaymentsTable.transactionId,
      creditCardId: creditCardPaymentsTable.creditCardId,
      paymentId: creditCardPaymentsTable.id,
    })
    .from(creditCardPaymentsTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPaymentsTable.transactionId))
    .where(
      and(
        eq(transactionsTable.householdId, householdId),
        inArray(creditCardPaymentsTable.transactionId, transactionIds),
      ),
    );
}
