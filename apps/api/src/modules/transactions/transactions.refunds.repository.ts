import { entriesTable } from "@luraba/db/schemas/entries.schema";
import { transactionRefundsTable } from "@luraba/db/schemas/transaction-refunds.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { and, eq, inArray, sql } from "drizzle-orm";
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
