export const ACCOUNT_CLASSIFICATIONS = ["asset", "liability"] as const

export type AccountClassification = (typeof ACCOUNT_CLASSIFICATIONS)[number]

export const ACCOUNT_TYPES = [
  "depository",
  "loan",
  "credit_card",
  "property",
  "vehicle",
  "other_asset",
  "other_liability",
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]

export interface Account {
  id: string
  name: string
  institutionName: string | null
  institutionDomain: string | null
  institutionLogoUrl: string | null
  notes: string | null
  classification: AccountClassification
  type: AccountType
  currencyCode: string
  createdAt: string
  updatedAt: string
}

export interface AccountDetails extends Account {
  balance: number
}
