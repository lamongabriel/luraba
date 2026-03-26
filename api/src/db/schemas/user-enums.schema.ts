import { pgEnum } from 'drizzle-orm/pg-core';

export const preferredLanguageEnum = pgEnum('preferred_language', ['en', 'pt-BR']);
export const preferredCurrencyEnum = pgEnum('preferred_currency', ['BRL', 'USD', 'EUR']);
export const preferredTimezoneEnum = pgEnum('preferred_timezone', ['America/Sao_Paulo', 'UTC']);
export const preferredDateFormatEnum = pgEnum('preferred_date_format', ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);
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
export const defaultAccountOrderEnum = pgEnum('default_account_order', ['name_asc', 'name_desc', 'newest', 'oldest']);
export const countryCodeEnum = pgEnum('country_code', ['BR', 'US']);
export const themePreferenceEnum = pgEnum('theme_preference', ['light', 'dark', 'system']);
