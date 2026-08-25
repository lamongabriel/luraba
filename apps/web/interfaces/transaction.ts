import type { AccountClassification } from "@/interfaces/account"
import type { BaseListHttpQuery } from "@/interfaces/api"
import type { Tag } from "@/interfaces/tag"

export type TransactionType = "expense" | "income" | "transfer" | "adjustment"

export type TransactionFeedOriginType =
  | TransactionType
  | "credit_card_installment"
  | "credit_card_payment"

export type TransactionFeedRowKind =
  | "transaction"
  | "credit_card_installment"
  | "credit_card_payment"

export type TransactionTag = Pick<Tag, "id" | "name" | "color" | "icon">

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

export interface TransactionAnalyticsMetric {
  value: number
  previousValue: number | null
  changePercent: number | null
  trend: Array<{ date: string; value: number }>
}

export interface TransactionExpenseBreakdownItem {
  id: string | null
  name: string
  icon: string | null
  color: string | null
  amount: number
  percentage: number
}

export interface TransactionAnalytics {
  currencyCode: string
  dateFrom: string | null
  dateTo: string | null
  metrics: {
    moneyIn: TransactionAnalyticsMetric
    moneyOut: TransactionAnalyticsMetric
    net: TransactionAnalyticsMetric
  }
  expenseBreakdown: {
    items: TransactionExpenseBreakdownItem[]
  }
}

export type UpcomingTransactionSourceType =
  | "credit_card_installment"
  | "recurring_bill"

export interface UpcomingTransaction {
  sourceType: UpcomingTransactionSourceType
  sourceId: string
  parentId: string
  description: string
  effectiveDate: string
  amount: number
  currencyCode: string
  accountId: string | null
  accountName: string | null
  creditCardId: string | null
  creditCardName: string | null
  categoryId: string | null
  categoryName: string | null
  merchantId: string | null
  merchantName: string | null
  installmentNumber: number | null
  installmentCount: number | null
  recurringFrequency: string | null
}

export type TransactionSortField =
  | "amount"
  | "createdAt"
  | "description"
  | "originType"
  | "postedDate"
  | "purchaseDate"

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
  uncategorized?: boolean
  merchantIds?: string[]
  tagIds?: string[]
  paymentMethodCodes?: string[]
  currencyCodes?: string[]
  amountMin?: number
  amountMax?: number
  includeInBudget?: boolean
}

export type CreateTransactionBody =
  | {
      type: "expense" | "income"
      description: string
      amount: number
      currencyCode: string
      accountId: string
      categoryId?: string | null
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
  categoryId?: string | null
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
