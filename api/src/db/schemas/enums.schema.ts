import { pgEnum } from 'drizzle-orm/pg-core';

// ─── User Preference Enums ───────────────────────────────────────────────
export const preferredLanguageEnum = pgEnum('preferred_language', ['en', 'pt-BR']);
export const preferredCurrencyEnum = pgEnum('preferred_currency', ['BRL', 'USD', 'EUR']);
export const preferredTimezoneEnum = pgEnum('preferred_timezone', [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Lima',
  'Pacific/Honolulu',
  'Atlantic/Reykjavik',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
]);
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
export const themePreferenceEnum = pgEnum('theme_preference', ['light', 'dark', 'system']);

// ─── Account & Ledger Enums ──────────────────────────────────────────────
export const accountClassificationEnum = pgEnum('account_classification', ['asset', 'liability']);
export const accountTypeEnum = pgEnum('account_type', [
  'cash',
  'investment',
  'crypto',
  'loan',
  'credit_card',
  'property',
  'vehicle',
  'other_asset',
  'other_liability',
]);
export const cashAccountSubtypeEnum = pgEnum('cash_account_subtype', [
  'checking',
  'savings',
  'cash',
  'money_market',
  'certificate_of_deposit',
  'prepaid',
  'other',
]);
export const investmentAccountSubtypeEnum = pgEnum('investment_account_subtype', [
  'brokerage',
  'retirement',
  'pension',
  'education',
  'employee_stock',
  'other',
]);
export const cryptoAccountSubtypeEnum = pgEnum('crypto_account_subtype', [
  'exchange',
  'wallet',
  'custody',
  'staking',
  'other',
]);
export const propertyAccountSubtypeEnum = pgEnum('property_account_subtype', [
  'house',
  'apartment',
  'condominium',
  'land',
  'commercial',
  'storage',
  'parking',
  'other',
]);
export const propertyAreaUnitEnum = pgEnum('property_area_unit', ['sqm', 'sqft']);
export const vehicleAccountSubtypeEnum = pgEnum('vehicle_account_subtype', [
  'car',
  'motorcycle',
  'truck',
  'van',
  'recreational_vehicle',
  'boat',
  'aircraft',
  'other',
]);
export const vehicleMileageUnitEnum = pgEnum('vehicle_mileage_unit', ['km', 'mi']);
export const loanAccountSubtypeEnum = pgEnum('loan_account_subtype', [
  'mortgage',
  'auto',
  'student',
  'personal',
  'business',
  'line_of_credit',
  'other',
]);
export const loanInterestRateTypeEnum = pgEnum('loan_interest_rate_type', ['fixed', 'variable']);
export const loanPaymentFrequencyEnum = pgEnum('loan_payment_frequency', [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annually',
  'other',
]);
export const otherAssetSubtypeEnum = pgEnum('other_asset_subtype', [
  'collectible',
  'precious_metal',
  'business_ownership',
  'receivable',
  'other',
]);
export const otherLiabilitySubtypeEnum = pgEnum('other_liability_subtype', [
  'tax',
  'medical',
  'payable',
  'legal',
  'other',
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
