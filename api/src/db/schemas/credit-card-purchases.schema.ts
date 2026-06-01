import { integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { creditCardsTable } from './credit-cards.schema';
import { creditExpenseTimingEnum, creditInstallmentBudgetModeEnum } from './enums.schema';
import { transactionsTable } from './transactions.schema';

export const creditCardPurchasesTable = pgTable(
  'credit_card_purchases',
  {
    id: uuid().primaryKey().defaultRandom(),
    creditCardId: uuid('credit_card_id')
      .notNull()
      .references(() => creditCardsTable.id, { onDelete: 'cascade' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactionsTable.id, { onDelete: 'cascade' }),
    purchaseAmount: integer('purchase_amount').notNull(),
    installmentCount: integer('installment_count').notNull(),
    budgetExpenseTiming: creditExpenseTimingEnum('budget_expense_timing').notNull(),
    budgetInstallmentMode: creditInstallmentBudgetModeEnum('budget_installment_mode').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('credit_card_purchases_transaction_id_unique').on(table.transactionId)],
);
