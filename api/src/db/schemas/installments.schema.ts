import { bigint, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { creditCardsTable } from './credit-cards.schema';

export const installmentsTable = pgTable('installments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  creditCardId: integer('credit_card_id')
    .notNull()
    .references(() => creditCardsTable.id, { onDelete: 'cascade' }),
  totalAmount: bigint('total_amount', { mode: 'bigint' }).notNull(),
  count: integer().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});