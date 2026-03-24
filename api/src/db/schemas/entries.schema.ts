import { bigint, date, integer, pgTable, timestamp, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { transactionsTable } from './transactions.schema';
import { ledgerAccountsTable } from './ledger-accounts.schema';
import { currenciesTable } from './currencies.schema';
import { categoriesTable } from './categories.schema';

export const entriesTable = pgTable(
  'entries',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    transactionId: integer('transaction_id')
      .notNull()
      .references(() => transactionsTable.id, { onDelete: 'cascade' }),
    ledgerAccountId: integer('ledger_account_id')
      .notNull()
      .references(() => ledgerAccountsTable.id, { onDelete: 'restrict' }),
    amount: bigint({ mode: 'bigint' }).notNull(),
    currencyId: integer('currency_id')
      .notNull()
      .references(() => currenciesTable.id, { onDelete: 'restrict' }),
    categoryId: integer('category_id').references(() => categoriesTable.id, { onDelete: 'set null' }),
    billingCycleId: integer('billing_cycle_id'),
    installmentItemId: integer('installment_item_id'),
    budgetMonth: date('budget_month', { mode: 'date' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('entries_transaction_id_idx').on(table.transactionId),
    index('entries_ledger_account_id_idx').on(table.ledgerAccountId),
    index('entries_billing_cycle_id_idx').on(table.billingCycleId),
    index('entries_budget_month_idx').on(table.budgetMonth),
    check('entries_non_zero_amount_check', sql`${table.amount} <> 0`),
  ],
);