import type { Account, AccountDetails, AccountType } from "@/interfaces/account"

export type ListAccountsHttpResponse = AccountDetails[]

export interface CreateAccountHttpBody {
  currencyCode: string
  institutionDomain?: string
  institutionName?: string
  name: string
  notes?: string
  type: Exclude<AccountType, "credit_card">
}

export type CreateAccountHttpResponse = Account
