import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type {
  HouseholdCreditExpenseTiming,
  HouseholdCreditInstallmentBudgetMode,
  HouseholdMember,
  HouseholdRole,
  HouseholdSummary,
} from "@/interfaces/household"

export type HouseholdSortField =
  | "countryCode"
  | "createdAt"
  | "defaultCurrencyId"
  | "name"
  | "role"
  | "updatedAt"

export interface ListHouseholdsHttpQuery
  extends BaseListHttpQuery<HouseholdSortField> {
  roles?: HouseholdRole[]
  countryCodes?: Array<"BR" | "US">
  defaultCurrencyCodes?: string[]
  timezones?: string[]
  budgetMonthStartsOnMin?: number
  budgetMonthStartsOnMax?: number
  creditExpenseTimings?: HouseholdCreditExpenseTiming[]
  creditInstallmentBudgetModes?: HouseholdCreditInstallmentBudgetMode[]
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListHouseholdsHttpResponse = ListResponse<HouseholdSummary>

export interface CreateHouseholdHttpBody {
  name: string
  description?: string
  defaultCurrencyId?: string
  countryCode?: "BR" | "US"
  timezone?: string
  budgetMonthStartsOn?: number
  creditExpenseTiming?: HouseholdCreditExpenseTiming
  creditInstallmentBudgetMode?: HouseholdCreditInstallmentBudgetMode
}

export type CreateHouseholdHttpResponse = HouseholdSummary
export type UpdateHouseholdHttpBody = Partial<CreateHouseholdHttpBody>
export type UpdateHouseholdHttpResponse = HouseholdSummary

export type HouseholdMemberSortField =
  | "createdAt"
  | "email"
  | "emailVerified"
  | "lastActiveAt"
  | "name"
  | "role"
  | "updatedAt"

export interface ListHouseholdMembersHttpQuery
  extends BaseListHttpQuery<HouseholdMemberSortField> {
  roles?: HouseholdRole[]
  emailVerified?: boolean
  lastActiveAtFrom?: string
  lastActiveAtTo?: string
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListHouseholdMembersHttpResponse = ListResponse<HouseholdMember>
export interface UpdateHouseholdMemberHttpBody {
  role: HouseholdRole
}
export type UpdateHouseholdMemberHttpResponse = HouseholdMember
