import { bigint, integer, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { creditCardBillingCyclesTable } from "./credit-card-billing-cycles.schema";
import { creditCardPurchasesTable } from "./credit-card-purchases.schema";
import { creditCardsTable } from "./credit-cards.schema";

export const creditCardInstallmentsTable = pgTable(
  "credit_card_installments",
  {
    id: uuid().primaryKey().defaultRandom(),
    creditCardId: uuid("credit_card_id")
      .notNull()
      .references(() => creditCardsTable.id, { onDelete: "cascade" }),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => creditCardPurchasesTable.id, { onDelete: "cascade" }),
    billingCycleId: uuid("billing_cycle_id")
      .notNull()
      .references(() => creditCardBillingCyclesTable.id, { onDelete: "cascade" }),
    installmentNumber: integer("installment_number").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("credit_card_installments_purchase_number_unique").on(
      table.purchaseId,
      table.installmentNumber,
    ),
  ],
);
