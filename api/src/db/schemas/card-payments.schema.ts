import { bigint, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { transactionsTable } from './transactions.schema';
import { billingCyclesTable } from './billing-cycles.schema';

export const cardPaymentsTable = pgTable(
  'card_payments',
  {
    id: uuid().primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactionsTable.id, { onDelete: 'cascade' }),
    billingCycleId: uuid('billing_cycle_id')
      .notNull()
      .references(() => billingCyclesTable.id, { onDelete: 'restrict' }),
    amount: bigint({ mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('card_payments_transaction_unique').on(table.transactionId)],
);
