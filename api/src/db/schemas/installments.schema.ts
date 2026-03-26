import { bigint, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { creditCardsTable } from './credit-cards.schema';
import { transactionsTable } from './transactions.schema';

export const installmentsTable = pgTable('installments', {
  id: uuid().primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id')
    .notNull()
    .references(() => transactionsTable.id, { onDelete: 'cascade' })
    .unique(),
  creditCardId: uuid('credit_card_id')
    .notNull()
    .references(() => creditCardsTable.id, { onDelete: 'cascade' }),
  totalAmount: bigint('total_amount', { mode: 'bigint' }).notNull(),
  count: integer().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
