import { entriesTable } from "@luraba/db/schemas/entries.schema";
import { productsTable } from "@luraba/db/schemas/products.schema";
import { transactionItemsTable } from "@luraba/db/schemas/transaction-items.schema";
import { transactionsTable } from "@luraba/db/schemas/transactions.schema";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import type { TxClient } from "@/db/types";

export type TransactionItemRow = {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  position: number;
  imageUploadId: string | null;
};

type NewItem = Omit<typeof transactionItemsTable.$inferInsert, "id" | "createdAt">;

/** The transaction's currency (from its first entry) once it is proven to belong to the household. */
export async function findHouseholdTransactionCurrency(
  householdId: string,
  transactionId: string,
  executor: TxClient | typeof db = db,
): Promise<string | undefined> {
  const [row] = await executor
    .select({ currencyId: entriesTable.currencyId })
    .from(transactionsTable)
    .innerJoin(entriesTable, eq(entriesTable.transactionId, transactionsTable.id))
    .where(
      and(eq(transactionsTable.id, transactionId), eq(transactionsTable.householdId, householdId)),
    )
    .limit(1);
  return row?.currencyId;
}

export async function listItems(
  transactionId: string,
  executor: TxClient | typeof db = db,
): Promise<TransactionItemRow[]> {
  return executor
    .select({
      id: transactionItemsTable.id,
      productId: transactionItemsTable.productId,
      name: transactionItemsTable.name,
      quantity: transactionItemsTable.quantity,
      unitPrice: transactionItemsTable.unitPrice,
      position: transactionItemsTable.position,
      imageUploadId: productsTable.imageUploadId,
    })
    .from(transactionItemsTable)
    .leftJoin(productsTable, eq(productsTable.id, transactionItemsTable.productId))
    .where(eq(transactionItemsTable.transactionId, transactionId))
    .orderBy(asc(transactionItemsTable.position), asc(transactionItemsTable.createdAt));
}

export async function replaceItems(tx: TxClient, transactionId: string, items: NewItem[]) {
  await tx
    .delete(transactionItemsTable)
    .where(eq(transactionItemsTable.transactionId, transactionId));
  if (items.length > 0) await tx.insert(transactionItemsTable).values(items);
}
