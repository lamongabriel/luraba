"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  ListTransactionsHttpQuery,
  ListTransactionsHttpResponse,
} from "@/interfaces/http/transactions-http"
import type { AppQueryOptions } from "@/queries/query-options"
import { listTransactions } from "@/services/transactions.service"

export const transactionQueryKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionQueryKeys.all, "list"] as const,
  list: (filters: ListTransactionsHttpQuery) =>
    [...transactionQueryKeys.lists(), filters] as const,
}

export function useTransactionsQuery<TData = ListTransactionsHttpResponse>(
  filters: ListTransactionsHttpQuery = {},
  options?: AppQueryOptions<ListTransactionsHttpResponse, TData>,
) {
  return useQuery({
    queryKey: transactionQueryKeys.list(filters),
    queryFn: () => listTransactions(filters),
    placeholderData: (previousData) => previousData,
    ...options,
  })
}
