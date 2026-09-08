import { and, eq, isNotNull } from "drizzle-orm";
import { entriesTable } from "@/db/schemas/entries.schema";
import type { TxClient } from "@/db/types";
import type { EntryRecord } from "./entries.types";

class EntriesRepository {
  async createMany(
    tx: TxClient,
    values: Array<typeof entriesTable.$inferInsert>,
  ): Promise<EntryRecord[]> {
    if (values.length === 0) {
      return [];
    }

    return tx.insert(entriesTable).values(values).returning();
  }

  async updateBudgetMonth(tx: TxClient, transactionId: string, budgetMonth: Date): Promise<void> {
    await tx
      .update(entriesTable)
      .set({ budgetMonth })
      .where(
        and(eq(entriesTable.transactionId, transactionId), isNotNull(entriesTable.budgetMonth)),
      );
  }

  async updateCategoryId(tx: TxClient, transactionId: string, categoryId: string): Promise<void> {
    await tx
      .update(entriesTable)
      .set({ categoryId })
      .where(
        and(eq(entriesTable.transactionId, transactionId), isNotNull(entriesTable.categoryId)),
      );
  }

  async deleteByTransactionId(tx: TxClient, transactionId: string): Promise<void> {
    await tx.delete(entriesTable).where(eq(entriesTable.transactionId, transactionId));
  }
}

export const entriesRepository = new EntriesRepository();
