import { bigint, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { transactionsTable } from './transactions.schema';
import { billingCyclesTable } from './billing-cycles.schema';

export const cardPaymentsTable = pgTable('card_payments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  transactionId: integer('transaction_id')
    .notNull()
    .references(() => transactionsTable.id, { onDelete: 'cascade' }),
  billingCycleId: integer('billing_cycle_id')
    .notNull()
    .references(() => billingCyclesTable.id, { onDelete: 'restrict' }),
  amount: bigint({ mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});