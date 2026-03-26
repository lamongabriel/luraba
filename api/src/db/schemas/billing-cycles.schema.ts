import { date, index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { creditCardsTable } from './credit-cards.schema';
import { billingCycleStatusEnum } from './finance-enums.schema';

export const billingCyclesTable = pgTable(
  'billing_cycles',
  {
    id: uuid().primaryKey().defaultRandom(),
    creditCardId: uuid('credit_card_id').notNull().references(() => creditCardsTable.id, { onDelete: 'cascade' }),
    startDate: date('start_date', { mode: 'date' }).notNull(),
    endDate: date('end_date', { mode: 'date' }).notNull(),
    closingDate: date('closing_date', { mode: 'date' }).notNull(),
    dueDate: date('due_date', { mode: 'date' }).notNull(),
    status: billingCycleStatusEnum().notNull().default('future'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('billing_cycles_card_start_end_unique').on(table.creditCardId, table.startDate, table.endDate),
    index('billing_cycles_card_due_date_idx').on(table.creditCardId, table.dueDate),
  ],
);
