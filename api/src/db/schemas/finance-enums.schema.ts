import { pgEnum } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings', 'cash', 'wallet']);

export const ledgerAccountTypeEnum = pgEnum('ledger_account_type', [
  'asset',
  'liability',
  'expense',
  'income',
  'equity',
]);

export const ledgerOwnerTypeEnum = pgEnum('ledger_owner_type', ['account', 'credit_card', 'system']);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'expense',
  'income',
  'transfer',
  'card_purchase',
  'card_payment',
  'installment',
  'adjustment',
]);

export const categoryTypeEnum = pgEnum('category_type', ['expense', 'income']);

export const billingCycleStatusEnum = pgEnum('billing_cycle_status', [
  'future',
  'open',
  'closed',
  'due',
  'paid',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'debit',
  'pix',
  'boleto',
  'credit_card',
]);