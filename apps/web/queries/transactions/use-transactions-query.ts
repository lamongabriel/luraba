"use client"

import type {
  ListTransactionsQuery,
  ListTransactionsResult,
} from "@luraba/contracts"
import { useQuery } from "@tanstack/react-query"
import type { AppQueryOptions } from "@/queries/query-options"
import { listTransactions } from "@/services/transactions.service"

export const transactionQueryKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionQueryKeys.all, "list"] as const,
  list: (filters: ListTransactionsQuery) =>
    [...transactionQueryKeys.lists(), filters] as const,
}

export function useTransactionsQuery<TData = ListTransactionsResult>(
  filters: ListTransactionsQuery = {},
  options?: AppQueryOptions<ListTransactionsResult, TData>,
) {
  return useQuery({
    queryKey: transactionQueryKeys.list(filters),
    queryFn: () => listTransactions(filters),
    placeholderData: (previousData) => previousData,
    ...options,
  })
}
