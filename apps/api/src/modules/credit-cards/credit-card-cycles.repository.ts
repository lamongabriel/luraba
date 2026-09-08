import { toDate } from "@luraba/domain";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { creditCardBillingCyclesTable } from "@/db/schemas/credit-card-billing-cycles.schema";
import { creditCardInstallmentsTable } from "@/db/schemas/credit-card-installments.schema";
import { creditCardPaymentAllocationsTable } from "@/db/schemas/credit-card-payment-allocations.schema";
import { creditCardPaymentsTable } from "@/db/schemas/credit-card-payments.schema";
import { creditCardPurchasesTable } from "@/db/schemas/credit-card-purchases.schema";
import { transactionsTable } from "@/db/schemas/transactions.schema";
import type { TxClient } from "@/db/types";
import { type DbListPage, getPagination } from "@/shared/list";
import type { CreditCardCycleItemRow } from "./credit-cards.helpers";
import { mapCycleRow } from "./credit-cards.helpers";
import {
  buildCreditCardCyclesCte,
  buildCreditCardCyclesListOrder,
  type ListCreditCardCyclesQuery,
} from "./credit-cards.query";
import type { CreditCardCycleSummary } from "./credit-cards.types";

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

export async function listCyclesPage(
  creditCardId: string,
  query: ListCreditCardCyclesQuery,
  today: Date,
): Promise<DbListPage<CreditCardCycleSummary>> {
  const { limit, offset } = getPagination(query);
  const orderBy = buildCreditCardCyclesListOrder(query);
  const cyclesCte = buildCreditCardCyclesCte(creditCardId, today, query);
  const countResult = await db.execute<{ count: number }>(sql`
    ${cyclesCte}
    select count(*)::integer as count
    from filtered
  `);
  const rowsResult = await db.execute<{
    id: string;
    creditCardId: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    closingDate: Date | string;
    dueDate: Date | string;
    status: CreditCardCycleSummary["status"];
    statementAmount: number;
    paidAmount: number;
    remainingAmount: number;
    createdAt: Date;
    updatedAt: Date;
    displayStatus: CreditCardCycleSummary["displayStatus"];
    isCurrent: boolean;
    isNext: boolean;
    hasActivity: boolean;
  }>(sql`
    ${cyclesCte}
    select
      id,
      credit_card_id as "creditCardId",
      period_start as "periodStart",
      period_end as "periodEnd",
      closing_date as "closingDate",
      due_date as "dueDate",
      status,
      statement_amount as "statementAmount",
      paid_amount as "paidAmount",
      remaining_amount as "remainingAmount",
      created_at as "createdAt",
      updated_at as "updatedAt",
      display_status as "displayStatus",
      is_current as "isCurrent",
      is_next as "isNext",
      has_activity as "hasActivity"
    from filtered
    order by ${sql.join(orderBy, sql`, `)}
    limit ${limit}
    offset ${offset}
  `);

  return {
    rows: rowsResult.rows.map((row) => {
      const cycleRow = {
        ...row,
        periodStart: toDate(row.periodStart),
        periodEnd: toDate(row.periodEnd),
        closingDate: toDate(row.closingDate),
        dueDate: toDate(row.dueDate),
      };

      return {
        ...mapCycleRow(cycleRow),
        displayStatus: row.displayStatus,
        isCurrent: row.isCurrent,
        isNext: row.isNext,
        hasActivity: row.hasActivity,
      };
    }),
    totalCount: countResult.rows[0]?.count ?? 0,
  };
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
