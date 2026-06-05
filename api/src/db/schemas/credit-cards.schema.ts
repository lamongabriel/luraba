import {
  bigint,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accountsTable } from './accounts.schema';
import { creditCardProductTypeEnum } from './enums.schema';
import { householdsTable } from './households.schema';

export const creditCardsTable = pgTable(
  'credit_cards',
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => householdsTable.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accountsTable.id, { onDelete: 'cascade' }),
    brand: varchar({ length: 64 }).notNull(),
    productType: creditCardProductTypeEnum('product_type').notNull().default('credit'),
    last4: varchar('last4', { length: 4 }).notNull(),
    color: varchar({ length: 32 }),
    closingDay: integer('closing_day').notNull(),
    dueDay: integer('due_day').notNull(),
    unappliedCreditAmount: bigint('unapplied_credit_amount', { mode: 'number' })
      .notNull()
      .default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('credit_cards_account_id_unique').on(table.accountId)],
);
