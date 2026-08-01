import type {
  Account,
  AccountClassification,
  AccountDetails,
  AccountType,
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
  | "classification"
  | "currencyCode"
  | "balance"
  | "createdAt"
  | "updatedAt"

export interface ListAccountsHttpQuery
  extends BaseListHttpQuery<AccountSortField> {
  types?: AccountType[]
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

export type ListAccountsHttpResponse = ListResponse<AccountDetails>
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
}

export type CreateAccountHttpResponse = Account

export interface UpdateAccountHttpBody {
  name?: string
  institutionName?: string | null
  institutionDomain?: string | null
  notes?: string | null
}

export type UpdateAccountHttpResponse = Account
