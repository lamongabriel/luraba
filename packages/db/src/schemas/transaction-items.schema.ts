import { bigint, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { productsTable } from "./products.schema.js";
import { transactionsTable } from "./transactions.schema.js";

/**
 * What a transaction bought (optional). Child rows: no household column, reached through a
 * transaction already proven to belong to the household. `name` and `unit_price` are snapshots, so
 * an item keeps its history when the product is renamed, repriced or deleted.
 */
export const transactionItemsTable = pgTable(
  "transaction_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactionsTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => productsTable.id, { onDelete: "set null" }),
    name: varchar({ length: 255 }).notNull(),
    quantity: integer().notNull().default(1),
    /** Unit price in minor units, in the transaction's currency. */
    unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
    position: integer().notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("transaction_items_transaction_id_idx").on(table.transactionId),
    index("transaction_items_product_id_idx").on(table.productId),
  ],
);
