import type {
  AccountClassification,
  AccountDetails,
  AccountSubtype,
  AccountSummary,
  AccountType,
  CreateAccountProfile,
  UpdateAccountProfile,
} from "@/interfaces/account"
import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type {
  TransactionFeedRow,
  TransactionListFilters,
} from "@/interfaces/transaction"

export type AccountSortField =
  | "name"
  | "institutionName"
  | "type"
  | "subtype"
  | "classification"
  | "currencyCode"
  | "balance"
  | "createdAt"
  | "updatedAt"

export interface ListAccountsHttpQuery
  extends BaseListHttpQuery<AccountSortField> {
  types?: AccountType[]
  subtypes?: AccountSubtype[]
  classifications?: AccountClassification[]
  currencyCodes?: string[]
  balanceMin?: number
  balanceMax?: number
  hasInstitution?: boolean
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type ListAccountsHttpResponse = ListResponse<AccountSummary>
export type GetAccountHttpResponse = AccountDetails
export type ListAccountTransactionsHttpQuery = Omit<
  TransactionListFilters,
  "accountIds" | "creditCardIds"
>
export type ListAccountTransactionsHttpResponse =
  ListResponse<TransactionFeedRow>

export interface CreateAccountHttpBody {
  currencyCode: string
  institutionDomain?: string
  institutionName?: string
  name: string
  notes?: string
  type: Exclude<AccountType, "credit_card">
  details: CreateAccountProfile
  openingBalance?: number
  balanceAsOfDate?: string
}

export type CreateAccountHttpResponse = AccountDetails

export interface UpdateAccountHttpBody {
  name?: string
  institutionName?: string | null
  institutionDomain?: string | null
  notes?: string | null
  details?: UpdateAccountProfile
}

export type UpdateAccountHttpResponse = AccountDetails
