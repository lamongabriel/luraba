import { z } from 'zod';
import {
  creditExpenseTimingEnum,
  creditInstallmentBudgetModeEnum,
  defaultAccountOrderEnum,
  defaultPeriodEnum,
  preferredDateFormatEnum,
  preferredLanguageEnum,
  themePreferenceEnum,
} from '@/db/schemas/enums.schema';
import {
  isCountryCode,
  isTimezone,
  listCountryCodes,
  listTimezoneValues,
} from '@/shared/data/location-data';

export const LANGUAGE_VALUES = preferredLanguageEnum.enumValues;
export const TIMEZONE_VALUES = listTimezoneValues();
export const DATE_FORMAT_VALUES = preferredDateFormatEnum.enumValues;
export const PREFERRED_PERIOD_VALUES = defaultPeriodEnum.enumValues;
export const ACCOUNT_ORDER_VALUES = defaultAccountOrderEnum.enumValues;
export const COUNTRY_CODE_VALUES = listCountryCodes();
export const PREFERRED_THEME_VALUES = themePreferenceEnum.enumValues;
export const CREDIT_EXPENSE_TIMING_VALUES = creditExpenseTimingEnum.enumValues;
export const CREDIT_INSTALLMENT_BUDGET_MODE_VALUES = creditInstallmentBudgetModeEnum.enumValues;

export const languageSchema = z.enum(preferredLanguageEnum.enumValues);
export const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());
export const timezoneSchema = z
  .string()
  .trim()
  .refine(isTimezone, 'Timezone must be a supported IANA timezone.');
export const dateFormatSchema = z.enum(preferredDateFormatEnum.enumValues);
export const preferredPeriodSchema = z.enum(defaultPeriodEnum.enumValues);
export const accountOrderSchema = z.enum(defaultAccountOrderEnum.enumValues);
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isCountryCode, 'Country code must be a supported ISO 3166-1 alpha-2 code.');
export const preferredThemeSchema = z.enum(themePreferenceEnum.enumValues);
export const creditExpenseTimingSchema = z.enum(creditExpenseTimingEnum.enumValues);
export const creditInstallmentBudgetModeSchema = z.enum(creditInstallmentBudgetModeEnum.enumValues);

export type Language = z.infer<typeof languageSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type Timezone = z.infer<typeof timezoneSchema>;
export type DateFormat = z.infer<typeof dateFormatSchema>;
export type PreferredPeriod = z.infer<typeof preferredPeriodSchema>;
export type AccountOrder = z.infer<typeof accountOrderSchema>;
export type CountryCode = z.infer<typeof countryCodeSchema>;
export type PreferredTheme = z.infer<typeof preferredThemeSchema>;
export type CreditExpenseTiming = z.infer<typeof creditExpenseTimingSchema>;
export type CreditInstallmentBudgetMode = z.infer<typeof creditInstallmentBudgetModeSchema>;
