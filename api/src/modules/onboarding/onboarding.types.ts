import { z } from 'zod';
import {
  COUNTRY_CODE_VALUES,
  CREDIT_EXPENSE_TIMING_VALUES,
  CREDIT_INSTALLMENT_BUDGET_MODE_VALUES,
  DATE_FORMAT_VALUES,
  LANGUAGE_VALUES,
  PREFERRED_PERIOD_VALUES,
  PREFERRED_THEME_VALUES,
  TIMEZONE_VALUES,
} from '@/shared/validation/preferences';

export const OnboardingCurrencyOptionSchema = z.object({
  code: z.string().length(3),
  symbol: z.string(),
  precision: z.number().int().nonnegative(),
});

export const GetOnboardingOptionsResponseSchema = z.object({
  languages: z.array(z.enum(LANGUAGE_VALUES)),
  currencies: z.array(OnboardingCurrencyOptionSchema),
  timezones: z.array(z.enum(TIMEZONE_VALUES)),
  dateFormats: z.array(z.enum(DATE_FORMAT_VALUES)),
  preferredPeriods: z.array(z.enum(PREFERRED_PERIOD_VALUES)),
  preferredThemes: z.array(z.enum(PREFERRED_THEME_VALUES)),
  countryCodes: z.array(z.enum(COUNTRY_CODE_VALUES)),
  creditExpenseTimings: z.array(z.enum(CREDIT_EXPENSE_TIMING_VALUES)),
  creditInstallmentBudgetModes: z.array(z.enum(CREDIT_INSTALLMENT_BUDGET_MODE_VALUES)),
  budgetMonthStartDays: z.array(z.number().int().min(1).max(31)),
});

export type OnboardingCurrencyOption = z.infer<typeof OnboardingCurrencyOptionSchema>;
export type GetOnboardingOptionsResponse = z.infer<typeof GetOnboardingOptionsResponseSchema>;
