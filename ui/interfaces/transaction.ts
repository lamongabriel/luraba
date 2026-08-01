import type { AccountClassification } from "@/interfaces/account"
import type { BaseListHttpQuery } from "@/interfaces/api"

export type TransactionType = "expense" | "income" | "transfer" | "adjustment"

export type TransactionFeedOriginType =
  | TransactionType
  | "credit_card_installment"
  | "credit_card_payment"

export type TransactionFeedRowKind =
  | "transaction"
  | "credit_card_installment"
  | "credit_card_payment"

export interface TransactionTag {
  id: string
  name: string
  color: string | null
  icon: string | null
}

export interface TransactionResponse {
  id: string
  type: TransactionType
  description: string
  amount: number
  currencyCode: string
  toAmount: number | null
  toCurrencyCode: string | null
  accountId: string | null
  accountName: string | null
  accountClassification: AccountClassification | null
  toAccountId: string | null
  toAccountName: string | null
  toAccountClassification: AccountClassification | null
  categoryId: string | null
  merchantId: string | null
  paymentMethodId: string | null
  paymentMethodCode: string | null
  paymentMethodName: string | null
  paymentMethodScope: "system" | "household" | null
  paymentMethodTranslationKey: string | null
  tags: TransactionTag[]
  includeInBudget: boolean
  purchaseDate: string
  postedDate: string
  createdAt: string
  updatedAt: string
}

export interface TransactionFeedRow extends TransactionResponse {
  rowId: string
  rowKind: TransactionFeedRowKind
  originType: TransactionFeedOriginType
  excludedFromSpending: boolean
  creditCardId: string | null
  purchaseId: string | null
  paymentId: string | null
  installmentId: string | null
  installmentNumber: number | null
  installmentCount: number | null
}

export interface TransactionListSummary {
  totalCount: number
  incomeAmount: number
  expenseAmount: number
  transferCount: number
}

export type TransactionSortField =
  | "amount"
  | "createdAt"
  | "description"
  | "originType"
  | "postedDate"
  | "purchaseDate"
  | "updatedAt"

export interface TransactionListFilters
  extends BaseListHttpQuery<TransactionSortField> {
  dateFrom?: string
  dateTo?: string
  purchaseDateFrom?: string
  purchaseDateTo?: string
  originTypes?: TransactionFeedOriginType[]
  accountIds?: string[]
  creditCardIds?: string[]
  categoryIds?: string[]
  merchantIds?: string[]
  tagIds?: string[]
  paymentMethodCodes?: string[]
  currencyCodes?: string[]
  amountMin?: number
  amountMax?: number
  includeInBudget?: boolean
  excludedFromSpending?: boolean
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export type CreateTransactionBody =
  | {
      type: "expense" | "income"
      description: string
      amount: number
      currencyCode: string
      accountId: string
      categoryId: string
      merchantId?: string
      paymentMethodCode: string
      purchaseDate: string
      postedDate: string
      includeInBudget?: boolean
      tagIds?: string[]
    }
  | {
      type: "adjustment"
      description: string
      balance: number
      accountId: string
      purchaseDate: string
      postedDate: string
      includeInBudget?: boolean
      tagIds?: string[]
    }
  | {
      type: "transfer"
      description: string
      fromAccountId: string
      toAccountId: string
      fromAmount?: number
      toAmount?: number
      purchaseDate: string
      postedDate: string
      includeInBudget?: boolean
      tagIds?: string[]
    }

export interface UpdateTransactionBody {
  description?: string
  amount?: number
  currencyCode?: string
  accountId?: string
  categoryId?: string
  merchantId?: string | null
  paymentMethodCode?: string
  fromAccountId?: string
  toAccountId?: string
  fromAmount?: number
  toAmount?: number
  purchaseDate?: string
  postedDate?: string
  includeInBudget?: boolean
  tagIds?: string[]
}
