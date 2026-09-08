import { bigint, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { creditCardBillingCyclesTable } from "./credit-card-billing-cycles.schema";
import { creditCardPaymentsTable } from "./credit-card-payments.schema";

export const creditCardPaymentAllocationsTable = pgTable("credit_card_payment_allocations", {
  id: uuid().primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => creditCardPaymentsTable.id, { onDelete: "cascade" }),
  billingCycleId: uuid("billing_cycle_id").references(() => creditCardBillingCyclesTable.id, {
    onDelete: "cascade",
  }),
  amount: bigint("amount", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
