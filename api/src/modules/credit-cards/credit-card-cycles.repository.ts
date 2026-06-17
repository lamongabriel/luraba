import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { creditCardBillingCyclesTable } from '@/db/schemas/credit-card-billing-cycles.schema';
import { creditCardInstallmentsTable } from '@/db/schemas/credit-card-installments.schema';
import { creditCardPaymentAllocationsTable } from '@/db/schemas/credit-card-payment-allocations.schema';
import { creditCardPaymentsTable } from '@/db/schemas/credit-card-payments.schema';
import { creditCardPurchasesTable } from '@/db/schemas/credit-card-purchases.schema';
import { transactionsTable } from '@/db/schemas/transactions.schema';
import type { TxClient } from '@/db/types';
import type { CreditCardCycleItemRow } from './credit-cards.helpers';

export async function findCycleById(tx: TxClient, creditCardId: string, cycleId: string) {
  const rows = await tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        eq(creditCardBillingCyclesTable.id, cycleId),
        eq(creditCardBillingCyclesTable.creditCardId, creditCardId),
      ),
    );

  return rows[0];
}

export async function findCycleByPeriodStart(
  tx: TxClient,
  creditCardId: string,
  periodStart: Date,
) {
  const rows = await tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        eq(creditCardBillingCyclesTable.creditCardId, creditCardId),
        eq(creditCardBillingCyclesTable.periodStart, periodStart),
      ),
    )
    .limit(1);

  return rows[0];
}

export async function findCycleContainingDate(tx: TxClient, creditCardId: string, date: Date) {
  const rows = await tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        eq(creditCardBillingCyclesTable.creditCardId, creditCardId),
        lte(creditCardBillingCyclesTable.periodStart, date),
        gte(creditCardBillingCyclesTable.periodEnd, date),
      ),
    )
    .limit(1);

  return rows[0];
}

export async function findNextCycle(tx: TxClient, creditCardId: string, closingDate: Date) {
  const rows = await tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(
      and(
        eq(creditCardBillingCyclesTable.creditCardId, creditCardId),
        gte(creditCardBillingCyclesTable.closingDate, closingDate),
      ),
    )
    .orderBy(asc(creditCardBillingCyclesTable.closingDate))
    .limit(1);

  return rows[0];
}

export async function listCyclesByCardId(tx: TxClient, creditCardId: string) {
  return tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(eq(creditCardBillingCyclesTable.creditCardId, creditCardId))
    .orderBy(asc(creditCardBillingCyclesTable.closingDate));
}

export async function listCyclesByCardIdDesc(tx: TxClient, creditCardId: string) {
  return tx
    .select()
    .from(creditCardBillingCyclesTable)
    .where(eq(creditCardBillingCyclesTable.creditCardId, creditCardId))
    .orderBy(desc(creditCardBillingCyclesTable.closingDate));
}

export async function insertCycle(
  tx: TxClient,
  values: typeof creditCardBillingCyclesTable.$inferInsert,
) {
  const rows = await tx.insert(creditCardBillingCyclesTable).values(values).returning();
  return rows[0];
}

export async function updateCycle(
  tx: TxClient,
  cycleId: string,
  values: Partial<typeof creditCardBillingCyclesTable.$inferInsert>,
) {
  const rows = await tx
    .update(creditCardBillingCyclesTable)
    .set(values)
    .where(eq(creditCardBillingCyclesTable.id, cycleId))
    .returning();

  return rows[0];
}

export async function deleteCyclesByIds(tx: TxClient, cycleIds: string[]) {
  if (cycleIds.length === 0) return;
  await tx
    .delete(creditCardBillingCyclesTable)
    .where(inArray(creditCardBillingCyclesTable.id, cycleIds));
}

export async function deleteInstallmentsByCycleIds(tx: TxClient, cycleIds: string[]) {
  if (cycleIds.length === 0) return;
  await tx
    .delete(creditCardInstallmentsTable)
    .where(inArray(creditCardInstallmentsTable.billingCycleId, cycleIds));
}

export async function listInstallmentTotals(tx: TxClient, creditCardId: string) {
  return tx
    .select({
      billingCycleId: creditCardInstallmentsTable.billingCycleId,
      amount: sql<number>`coalesce(sum(${creditCardInstallmentsTable.amount}), 0)`.mapWith(Number),
    })
    .from(creditCardInstallmentsTable)
    .where(eq(creditCardInstallmentsTable.creditCardId, creditCardId))
    .groupBy(creditCardInstallmentsTable.billingCycleId);
}

export async function listPaymentAllocationTotals(tx: TxClient, creditCardId: string) {
  return tx
    .select({
      billingCycleId: creditCardPaymentAllocationsTable.billingCycleId,
      amount: sql<number>`coalesce(sum(${creditCardPaymentAllocationsTable.amount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(creditCardPaymentAllocationsTable)
    .innerJoin(
      creditCardPaymentsTable,
      eq(creditCardPaymentsTable.id, creditCardPaymentAllocationsTable.paymentId),
    )
    .where(eq(creditCardPaymentsTable.creditCardId, creditCardId))
    .groupBy(creditCardPaymentAllocationsTable.billingCycleId);
}

export async function loadCycleItems(
  cardId: string,
  cycleId: string,
): Promise<CreditCardCycleItemRow[]> {
  return db
    .select({
      installmentId: creditCardInstallmentsTable.id,
      purchaseId: creditCardPurchasesTable.id,
      transactionId: creditCardPurchasesTable.transactionId,
      description: transactionsTable.description,
      categoryId: transactionsTable.categoryId,
      merchantId: transactionsTable.merchantId,
      installmentNumber: creditCardInstallmentsTable.installmentNumber,
      installmentCount: creditCardPurchasesTable.installmentCount,
      amount: creditCardInstallmentsTable.amount,
      purchaseDate: transactionsTable.purchaseDate,
      postedDate: transactionsTable.postedDate,
    })
    .from(creditCardInstallmentsTable)
    .innerJoin(
      creditCardPurchasesTable,
      eq(creditCardPurchasesTable.id, creditCardInstallmentsTable.purchaseId),
    )
    .innerJoin(transactionsTable, eq(transactionsTable.id, creditCardPurchasesTable.transactionId))
    .where(
      and(
        eq(creditCardInstallmentsTable.creditCardId, cardId),
        eq(creditCardInstallmentsTable.billingCycleId, cycleId),
      ),
    )
    .orderBy(
      asc(creditCardInstallmentsTable.installmentNumber),
      asc(creditCardInstallmentsTable.createdAt),
    );
}
