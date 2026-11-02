import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { creditCardBillingCyclesTable } from "./credit-card-billing-cycles.schema.js";
import { creditCardsTable } from "./credit-cards.schema.js";
import { refundReasonEnum } from "./enums.schema.js";
import { transactionsTable } from "./transactions.schema.js";

/**
 * Detail row of a `refund` transaction: money that comes back (refund, cancellation, chargeback,
 * cashback) without a source account. A card credit sets `creditCardId` and the invoice it
 * lands on (`billingCycleId`); an account credit leaves both null.
 */
export const transactionRefundsTable = pgTable(
  "transaction_refunds",
  {
    id: uuid().primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactionsTable.id, { onDelete: "cascade" }),
    reason: refundReasonEnum("reason").notNull(),
    originalTransactionId: uuid("original_transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    creditCardId: uuid("credit_card_id").references(() => creditCardsTable.id, {
      onDelete: "cascade",
    }),
    billingCycleId: uuid("billing_cycle_id").references(() => creditCardBillingCyclesTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("transaction_refunds_transaction_id_unique").on(table.transactionId),
    index("transaction_refunds_original_idx").on(table.originalTransactionId),
    index("transaction_refunds_billing_cycle_idx").on(table.billingCycleId),
  ],
);
