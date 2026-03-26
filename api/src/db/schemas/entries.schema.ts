import { bigint, check, date, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { transactionsTable } from './transactions.schema';
import { ledgerAccountsTable } from './ledger-accounts.schema';
import { currenciesTable } from './currencies.schema';
import { categoriesTable } from './categories.schema';
import { billingCyclesTable } from './billing-cycles.schema';

export const entriesTable = pgTable(
  'entries',
  {
    id: uuid().primaryKey().defaultRandom(),
    transactionId: uuid('transaction_id').notNull().references(() => transactionsTable.id, { onDelete: 'cascade' }),
    ledgerAccountId: uuid('ledger_account_id').notNull().references(() => ledgerAccountsTable.id, { onDelete: 'restrict' }),
    amount: bigint({ mode: 'bigint' }).notNull(),
    currencyId: uuid('currency_id').notNull().references(() => currenciesTable.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id').references(() => categoriesTable.id, { onDelete: 'set null' }),
    billingCycleId: uuid('billing_cycle_id').references(() => billingCyclesTable.id, { onDelete: 'restrict' }),
    installmentItemId: uuid('installment_item_id'),
    budgetMonth: date('budget_month', { mode: 'date' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('entries_transaction_id_idx').on(table.transactionId),
    index('entries_ledger_account_id_idx').on(table.ledgerAccountId),
    index('entries_billing_cycle_id_idx').on(table.billingCycleId),
    index('entries_budget_month_idx').on(table.budgetMonth),
    index('entries_ledger_currency_cycle_idx').on(table.ledgerAccountId, table.currencyId, table.billingCycleId),
    check('entries_non_zero_amount_check', sql`${table.amount} <> 0`),
  ],
);
