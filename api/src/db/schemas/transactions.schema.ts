import { boolean, date, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { transactionTypeEnum } from './enums.schema';
import { categoriesTable } from './categories.schema';
import { paymentMethodsTable } from './payment-methods.schema';
import { usersTable } from './users.schema';
import { merchantsTable } from './merchants.schema';

export const transactionsTable = pgTable(
  'transactions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    type: transactionTypeEnum().notNull(),
    paymentMethodId: uuid('payment_method_id').references(() => paymentMethodsTable.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id').references(() => categoriesTable.id, { onDelete: 'set null' }),
    description: varchar({ length: 512 }).notNull(),
    includeInBudget: boolean('include_in_budget').notNull().default(true),
    merchantId: uuid('merchant_id').references(() => merchantsTable.id, { onDelete: 'set null' }),
    purchaseDate: date('purchase_date', { mode: 'date' }).notNull(),
    postedDate: date('posted_date', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_payment_method_id_idx').on(table.paymentMethodId),
    index('transactions_posted_date_idx').on(table.postedDate),
    index('transactions_purchase_date_idx').on(table.purchaseDate),
  ],
);
