export type DefaultPeriodOption =
  | "last_day"
  | "current_week"
  | "last_7_days"
  | "current_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "current_year"
  | "last_365_days"
  | "last_5_years"
  | "last_10_years"
  | "all_time";

export type CreditExpenseTiming = "spend_month" | "payment_month";
export type CreditInstallmentBudgetMode = "per_installment" | "full_amount";

export interface UserPreferences {
  language: "en" | "pt-BR";
  currency: "BRL" | "USD" | "EUR";
  timezone: "America/Sao_Paulo" | "UTC";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  defaultPeriod: DefaultPeriodOption;
  defaultAccountOrder: "name_asc" | "name_desc" | "newest" | "oldest";
  countryCode: "BR" | "US";
  budgetMonthStartsOn: number;
  creditExpenseTiming: CreditExpenseTiming;
  creditInstallmentBudgetMode: CreditInstallmentBudgetMode;
  theme: "light" | "dark" | "system";
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}
