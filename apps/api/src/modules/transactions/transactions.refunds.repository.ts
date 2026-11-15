import { creditCardPurchasesTable } from "@luraba/db/schemas/credit-card-purchases.schema";
import { entriesTable } from "@luraba/db/schemas/entries.schema";
import { transactionRefundsTable } from "@luraba/db/schemas/transaction-refunds.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import type { TxClient } from "@/db/types";

export type RefundRecord = typeof transactionRefundsTable.$inferSelect;

export async function insertRefund(
  tx: TxClient,
  values: typeof transactionRefundsTable.$inferInsert,
): Promise<RefundRecord> {
  const [row] = await tx.insert(transactionRefundsTable).values(values).returning();
  return row;
}

/** Refund details of the given transactions (the caller has already scoped them to the household). */
export async function listByTransactionIds(transactionIds: string[]): Promise<RefundRecord[]> {
  if (transactionIds.length === 0) return [];
  return db
    .select()
    .from(transactionRefundsTable)
    .where(inArray(transactionRefundsTable.transactionId, transactionIds));
}

/** How much has already come back against an original transaction, in minor units. */
export async function sumRefundedAgainst(
  householdId: string,
  originalTransactionId: string,
  /** A money-back row to leave out (when re-linking it, it must not count against itself). */
  excludeTransactionId?: string,
): Promise<number> {
  const [row] = await db
    .select({
      amount: sql<number>`coalesce(sum(${entriesTable.amount}), 0)`.mapWith(Number),
    })
    .from(transactionRefundsTable)
    .innerJoin(
      transactionsTable,
      and(
        eq(transactionsTable.id, transactionRefundsTable.transactionId),
        eq(transactionsTable.householdId, householdId),
      ),
    )
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .where(
      and(
        eq(transactionRefundsTable.originalTransactionId, originalTransactionId),
        sql`${entriesTable.amount} > 0`,
        excludeTransactionId ? ne(transactionsTable.id, excludeTransactionId) : undefined,
      ),
    );
  return row?.amount ?? 0;
}

export async function findRefundByTransactionId(
  tx: TxClient,
  transactionId: string,
): Promise<RefundRecord | null> {
  const [row] = await tx
    .select()
    .from(transactionRefundsTable)
    .where(eq(transactionRefundsTable.transactionId, transactionId));
  return row ?? null;
}

/** Money-back rows linked to each of the given originals (the caller scopes the originals to the household). */
export async function listLinkedToOriginals(
  householdId: string,
  originalTransactionIds: string[],
): Promise<
  Array<{
    originalTransactionId: string;
    transactionId: string;
    reason: RefundRecord["reason"];
    creditCardId: string | null;
  }>
> {
  if (originalTransactionIds.length === 0) return [];
  const rows = await db
    .select({
      originalTransactionId: transactionRefundsTable.originalTransactionId,
      transactionId: transactionRefundsTable.transactionId,
      reason: transactionRefundsTable.reason,
      creditCardId: transactionRefundsTable.creditCardId,
    })
    .from(transactionRefundsTable)
    .innerJoin(
      transactionsTable,
      and(
        eq(transactionsTable.id, transactionRefundsTable.transactionId),
        eq(transactionsTable.householdId, householdId),
      ),
    )
    .where(inArray(transactionRefundsTable.originalTransactionId, originalTransactionIds));
  return rows.flatMap((row) =>
    row.originalTransactionId ? [{ ...row, originalTransactionId: row.originalTransactionId }] : [],
  );
}

/** Points a money-back row at its purchase, or detaches it with `null`. */
export async function setOriginalTransactionId(
  tx: TxClient,
  transactionId: string,
  originalTransactionId: string | null,
): Promise<void> {
  await tx
    .update(transactionRefundsTable)
    .set({ originalTransactionId })
    .where(eq(transactionRefundsTable.transactionId, transactionId));
}

/** Purchase totals (all installments) by underlying transaction id. */
export async function listPurchaseTotals(transactionIds: string[]): Promise<Map<string, number>> {
  if (transactionIds.length === 0) return new Map();
  const rows = await db
    .select({
      transactionId: creditCardPurchasesTable.transactionId,
      amount: creditCardPurchasesTable.purchaseAmount,
    })
    .from(creditCardPurchasesTable)
    .where(inArray(creditCardPurchasesTable.transactionId, transactionIds));
  return new Map(rows.map((row) => [row.transactionId, row.amount]));
}
