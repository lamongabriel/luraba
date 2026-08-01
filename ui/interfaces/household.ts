export type HouseholdRole = "owner" | "admin" | "member" | "viewer"

export type HouseholdCreditExpenseTiming = "spend_month" | "payment_month"

export type HouseholdCreditInstallmentBudgetMode =
  | "per_installment"
  | "full_amount"

export interface HouseholdSettings {
  defaultCurrencyId: string
  countryCode: string
  timezone: string
  budgetMonthStartsOn: number
  creditExpenseTiming: HouseholdCreditExpenseTiming
  creditInstallmentBudgetMode: HouseholdCreditInstallmentBudgetMode
}

export interface HouseholdSummary extends HouseholdSettings {
  id: string
  name: string
  description: string | null
  role: HouseholdRole
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export interface HouseholdContext {
  id: string
  name: string
  role: HouseholdRole
  permissions: string[]
  settings: HouseholdSettings
}

export interface HouseholdMember {
  id: string
  householdId: string
  userId: string
  name: string
  email: string
  image: string | null
  emailVerified: boolean
  role: HouseholdRole
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}
