import { bigint, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { creditCardsTable } from "./credit-cards.schema";
import { transactionsTable } from "./transactions.schema";

export const creditCardPaymentsTable = pgTable(
  "credit_card_payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    creditCardId: uuid("credit_card_id")
      .notNull()
      .references(() => creditCardsTable.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactionsTable.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("credit_card_payments_transaction_id_unique").on(table.transactionId)],
);
