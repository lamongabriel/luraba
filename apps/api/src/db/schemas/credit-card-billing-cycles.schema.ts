import { bigint, date, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { creditCardsTable } from './credit-cards.schema';
import { creditCardCycleStatusEnum } from './enums.schema';

export const creditCardBillingCyclesTable = pgTable(
  'credit_card_billing_cycles',
  {
    id: uuid().primaryKey().defaultRandom(),
    creditCardId: uuid('credit_card_id')
      .notNull()
      .references(() => creditCardsTable.id, { onDelete: 'cascade' }),
    periodStart: date('period_start', { mode: 'date' }).notNull(),
    periodEnd: date('period_end', { mode: 'date' }).notNull(),
    closingDate: date('closing_date', { mode: 'date' }).notNull(),
    dueDate: date('due_date', { mode: 'date' }).notNull(),
    status: creditCardCycleStatusEnum('status').notNull().default('open'),
    statementAmount: bigint('statement_amount', { mode: 'number' }).notNull().default(0),
    paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
    remainingAmount: bigint('remaining_amount', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('credit_card_billing_cycles_card_period_start_unique').on(
      table.creditCardId,
      table.periodStart,
    ),
  ],
);
