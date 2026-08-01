"use client"

import type {
  CreateTransactionHttpBody,
  CreateTransactionHttpResponse,
  ListTransactionsHttpQuery,
  ListTransactionsHttpResponse,
  UpdateTransactionHttpBody,
  UpdateTransactionHttpResponse,
} from "@/interfaces/http/transactions-http"
import type {
  TransactionFeedRow,
  TransactionListSummary,
} from "@/interfaces/transaction"
import {
  deleteApiResource,
  getApiList,
  patchApiData,
  postApiData,
} from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

export function listTransactions(
  query: ListTransactionsHttpQuery = {},
): Promise<ListTransactionsHttpResponse> {
  return getApiList<TransactionFeedRow, TransactionListSummary>(
    "/transactions",
    {
      params: serializeHttpQuery(query),
    },
  )
}

export function createTransaction(
  body: CreateTransactionHttpBody,
): Promise<CreateTransactionHttpResponse> {
  return postApiData("/transactions", body)
}

export function updateTransaction({
  id,
  body,
}: {
  id: string
  body: UpdateTransactionHttpBody
}): Promise<UpdateTransactionHttpResponse> {
  return patchApiData(`/transactions/${id}`, body)
}

export function deleteTransaction(id: string): Promise<void> {
  return deleteApiResource(`/transactions/${id}`)
}
