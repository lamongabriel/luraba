import type {
  HouseholdCreditExpenseTiming,
  HouseholdCreditInstallmentBudgetMode,
} from "@/interfaces/household"
import type {
  UserDateFormat,
  UserLanguage,
  UserPreferredPeriod,
  UserPreferredTheme,
} from "@/interfaces/user"

export interface OnboardingCurrencyOption {
  code: string
  symbol: string
  precision: number
}

export interface OnboardingOptions {
  languages: UserLanguage[]
  currencies: OnboardingCurrencyOption[]
  timezones: string[]
  dateFormats: UserDateFormat[]
  preferredPeriods: UserPreferredPeriod[]
  preferredThemes: UserPreferredTheme[]
  countryCodes: string[]
  creditExpenseTimings: HouseholdCreditExpenseTiming[]
  creditInstallmentBudgetModes: HouseholdCreditInstallmentBudgetMode[]
  budgetMonthStartDays: number[]
}
