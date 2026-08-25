"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  TransactionAnalyticsHttpQuery,
  TransactionAnalyticsHttpResponse,
  UpcomingTransactionsHttpQuery,
  UpcomingTransactionsHttpResponse,
} from "@/interfaces/http/transactions-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  getTransactionAnalytics,
  listUpcomingTransactions,
} from "@/services/transactions.service"

export const transactionAnalyticsQueryKeys = {
  all: ["transactions"] as const,
  analytics: (query: TransactionAnalyticsHttpQuery) =>
    [...transactionAnalyticsQueryKeys.all, "analytics", query] as const,
  upcoming: (query: UpcomingTransactionsHttpQuery) =>
    [...transactionAnalyticsQueryKeys.all, "upcoming", query] as const,
}

export function useTransactionAnalyticsQuery(
  query: TransactionAnalyticsHttpQuery = {},
  options?: AppQueryOptions<TransactionAnalyticsHttpResponse>,
) {
  return useQuery({
    queryKey: transactionAnalyticsQueryKeys.analytics(query),
    queryFn: () => getTransactionAnalytics(query),
    ...options,
  })
}

export function useUpcomingTransactionsQuery(
  query: UpcomingTransactionsHttpQuery = {},
  options?: AppQueryOptions<UpcomingTransactionsHttpResponse>,
) {
  return useQuery({
    queryKey: transactionAnalyticsQueryKeys.upcoming(query),
    queryFn: () => listUpcomingTransactions(query),
    ...options,
  })
}
