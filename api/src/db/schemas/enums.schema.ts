import { pgEnum } from 'drizzle-orm/pg-core';

// ─── User Preference Enums ───────────────────────────────────────────────
export const preferredLanguageEnum = pgEnum('preferred_language', ['en', 'pt-BR']);
export const preferredCurrencyEnum = pgEnum('preferred_currency', ['BRL', 'USD', 'EUR']);
export const preferredTimezoneEnum = pgEnum('preferred_timezone', ['America/Sao_Paulo', 'UTC']);
export const preferredDateFormatEnum = pgEnum('preferred_date_format', [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
]);
export const defaultPeriodEnum = pgEnum('default_period', [
  'last_day',
  'current_week',
  'last_7_days',
  'current_month',
  'last_month',
  'last_30_days',
  'last_90_days',
  'current_year',
  'last_365_days',
  'last_5_years',
  'last_10_years',
  'all_time',
]);
export const defaultAccountOrderEnum = pgEnum('default_account_order', [
  'name_asc',
  'name_desc',
  'newest',
  'oldest',
]);
export const countryCodeEnum = pgEnum('country_code', ['BR', 'US']);
export const themePreferenceEnum = pgEnum('theme_preference', ['light', 'dark', 'system']);

// ─── Account & Ledger Enums ──────────────────────────────────────────────
export const accountClassificationEnum = pgEnum('account_classification', ['asset', 'liability']);
export const accountTypeEnum = pgEnum('account_type', [
  'depository',
  'loan',
  'credit_card',
  'property',
  'vehicle',
  'other_asset',
  'other_liability',
]);
export const ledgerClassificationEnum = pgEnum('ledger_classification', ['asset', 'liability']);
export const ledgerAccountTypeEnum = ledgerClassificationEnum;
export const ledgerOwnerTypeEnum = pgEnum('ledger_owner_type', ['account', 'system']);
export const householdRoleEnum = pgEnum('household_role', ['owner', 'admin', 'member', 'viewer']);
export const householdInviteStatusEnum = pgEnum('household_invite_status', [
  'pending',
  'accepted',
  'rejected',
  'canceled',
]);

// ─── Transaction & Category Enums ────────────────────────────────────────
export const transactionTypeEnum = pgEnum('transaction_type', [
  'expense',
  'income',
  'transfer',
  'adjustment',
]);
export const categoryTypeEnum = pgEnum('category_type', ['expense', 'income']);

export const creditExpenseTimingEnum = pgEnum('credit_expense_timing', [
  'spend_month',
  'payment_month',
]);
export const creditInstallmentBudgetModeEnum = pgEnum('credit_installment_budget_mode', [
  'per_installment',
  'full_amount',
]);
export const creditCardProductTypeEnum = pgEnum('credit_card_product_type', ['credit']);
export const creditCardCycleStatusEnum = pgEnum('credit_card_cycle_status', [
  'open',
  'closed',
  'paid',
]);
