import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type {
  CreateTransactionBody,
  TransactionAnalytics,
  TransactionFeedRow,
  TransactionListFilters,
  TransactionListSummary,
  TransactionResponse,
  UpcomingTransaction,
  UpdateTransactionBody,
} from "@/interfaces/transaction"

export type ListTransactionsHttpQuery = TransactionListFilters
export type ListTransactionsHttpResponse = ListResponse<
  TransactionFeedRow,
  TransactionListSummary
>
export type CreateTransactionHttpBody = CreateTransactionBody
export type CreateTransactionHttpResponse = TransactionResponse
export type UpdateTransactionHttpBody = UpdateTransactionBody
export type UpdateTransactionHttpResponse = TransactionResponse

export type TransactionAnalyticsHttpQuery = Omit<
  TransactionListFilters,
  keyof BaseListHttpQuery
>
export type TransactionAnalyticsHttpResponse = TransactionAnalytics
export type UpcomingTransactionsHttpQuery = BaseListHttpQuery<"effectiveDate"> &
  TransactionAnalyticsHttpQuery
export type UpcomingTransactionsHttpResponse = ListResponse<UpcomingTransaction>
