import { currenciesRepository } from '@/modules/currencies/currencies.repository';
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
import type { GetOnboardingOptionsResponse } from './onboarding.types';

export async function getOptions(): Promise<GetOnboardingOptionsResponse> {
  const currencies = await currenciesRepository.list();

  return {
    languages: [...LANGUAGE_VALUES],
    currencies: currencies.map((currency) => ({
      code: currency.code,
      symbol: currency.symbol,
      precision: currency.precision,
    })),
    timezones: [...TIMEZONE_VALUES],
    dateFormats: [...DATE_FORMAT_VALUES],
    preferredPeriods: [...PREFERRED_PERIOD_VALUES],
    preferredThemes: [...PREFERRED_THEME_VALUES],
    countryCodes: [...COUNTRY_CODE_VALUES],
    creditExpenseTimings: [...CREDIT_EXPENSE_TIMING_VALUES],
    creditInstallmentBudgetModes: [...CREDIT_INSTALLMENT_BUDGET_MODE_VALUES],
    budgetMonthStartDays: Array.from({ length: 31 }, (_, index) => index + 1),
  };
}
