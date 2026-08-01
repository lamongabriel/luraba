import type {
  HouseholdCreditExpenseTiming,
  HouseholdCreditInstallmentBudgetMode,
} from "@/interfaces/household"
import type {
  UserDateFormat,
  UserLanguage,
  UserPreferredPeriod,
  UserPreferredTheme,
  UserTimezone,
} from "@/interfaces/user"

export interface OnboardingCurrencyOption {
  code: string
  symbol: string
  precision: number
}

export interface OnboardingOptions {
  languages: UserLanguage[]
  currencies: OnboardingCurrencyOption[]
  timezones: UserTimezone[]
  dateFormats: UserDateFormat[]
  preferredPeriods: UserPreferredPeriod[]
  preferredThemes: UserPreferredTheme[]
  countryCodes: Array<"BR" | "US">
  creditExpenseTimings: HouseholdCreditExpenseTiming[]
  creditInstallmentBudgetModes: HouseholdCreditInstallmentBudgetMode[]
  budgetMonthStartDays: number[]
}
