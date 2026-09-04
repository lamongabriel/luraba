"use client"

import type {
  TransactionAnalyticsQuery,
  TransactionAnalyticsResult,
  UpcomingTransactionsQuery,
  UpcomingTransactionsResult,
} from "@luraba/contracts"
import { useQuery } from "@tanstack/react-query"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  getTransactionAnalytics,
  listUpcomingTransactions,
} from "@/services/transactions.service"

export const transactionAnalyticsQueryKeys = {
  all: ["transactions"] as const,
  analytics: (query: TransactionAnalyticsQuery) =>
    [...transactionAnalyticsQueryKeys.all, "analytics", query] as const,
  upcoming: (query: UpcomingTransactionsQuery) =>
    [...transactionAnalyticsQueryKeys.all, "upcoming", query] as const,
}

export function useTransactionAnalyticsQuery(
  query: TransactionAnalyticsQuery = {},
  options?: AppQueryOptions<TransactionAnalyticsResult>,
) {
  return useQuery({
    queryKey: transactionAnalyticsQueryKeys.analytics(query),
    queryFn: () => getTransactionAnalytics(query),
    ...options,
  })
}

export function useUpcomingTransactionsQuery(
  query: UpcomingTransactionsQuery = {},
  options?: AppQueryOptions<UpcomingTransactionsResult>,
) {
  return useQuery({
    queryKey: transactionAnalyticsQueryKeys.upcoming(query),
    queryFn: () => listUpcomingTransactions(query),
    ...options,
  })
}
