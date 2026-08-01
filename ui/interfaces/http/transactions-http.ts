import type { ListResponse } from "@/interfaces/api"
import type {
  CreateTransactionBody,
  TransactionFeedRow,
  TransactionListFilters,
  TransactionListSummary,
  TransactionResponse,
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
