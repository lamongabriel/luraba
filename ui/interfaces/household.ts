export type HouseholdRole = "owner" | "admin" | "member";

export type HouseholdCreditExpenseTiming = "spend_month" | "due_month";

export type HouseholdCreditInstallmentBudgetMode =
  | "per_installment"
  | "full_purchase_month";

export interface HouseholdSettings {
  defaultCurrencyId: string;
  countryCode: string;
  timezone: string;
  budgetMonthStartsOn: number;
  creditExpenseTiming: HouseholdCreditExpenseTiming;
  creditInstallmentBudgetMode: HouseholdCreditInstallmentBudgetMode;
}

export interface HouseholdSummary extends HouseholdSettings {
  id: string;
  name: string;
  description: string | null;
  role: HouseholdRole;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdContext {
  id: string;
  name: string;
  role: HouseholdRole;
  permissions: string[];
  settings: HouseholdSettings;
}
