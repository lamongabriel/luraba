"use client"

import { useQuery } from "@tanstack/react-query"

import type {
  GetNetWorthAccountsHttpResponse,
  GetNetWorthBreakdownHttpResponse,
  GetNetWorthCashFlowHttpResponse,
  GetNetWorthCreditCardsHttpResponse,
  GetNetWorthHistoryHttpResponse,
  GetNetWorthRecentActivityHttpResponse,
  GetNetWorthSummaryHttpResponse,
  NetWorthHttpQuery,
} from "@/interfaces/http/networth-http"
import type { AppQueryOptions } from "@/queries/query-options"
import {
  getNetWorthAccounts,
  getNetWorthCashFlow,
  getNetWorthCreditCards,
  getNetWorthHistory,
  getNetWorthIncomeBreakdown,
  getNetWorthRecentActivity,
  getNetWorthSpendingBreakdown,
  getNetWorthSummary,
} from "@/services/networth.service"

export const netWorthQueryKeys = {
  all: ["networth"] as const,
  widget: (name: string, query: NetWorthHttpQuery) =>
    [...netWorthQueryKeys.all, name, query] as const,
}

function useNetWorthWidget<TData>(
  name: string,
  query: NetWorthHttpQuery,
  queryFn: () => Promise<TData>,
  options?: AppQueryOptions<TData>,
) {
  return useQuery({
    queryKey: netWorthQueryKeys.widget(name, query),
    queryFn,
    ...options,
  })
}

export function useNetWorthSummaryQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthSummaryHttpResponse>,
) {
  return useNetWorthWidget(
    "summary",
    query,
    () => getNetWorthSummary(query),
    options,
  )
}
export function useNetWorthHistoryQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthHistoryHttpResponse>,
) {
  return useNetWorthWidget(
    "history",
    query,
    () => getNetWorthHistory(query),
    options,
  )
}
export function useNetWorthAccountsQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthAccountsHttpResponse>,
) {
  return useNetWorthWidget(
    "accounts",
    query,
    () => getNetWorthAccounts(query),
    options,
  )
}
export function useNetWorthCashFlowQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthCashFlowHttpResponse>,
) {
  return useNetWorthWidget(
    "cash-flow",
    query,
    () => getNetWorthCashFlow(query),
    options,
  )
}
export function useNetWorthSpendingQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthBreakdownHttpResponse>,
) {
  return useNetWorthWidget(
    "spending",
    query,
    () => getNetWorthSpendingBreakdown(query),
    options,
  )
}
export function useNetWorthIncomeQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthBreakdownHttpResponse>,
) {
  return useNetWorthWidget(
    "income",
    query,
    () => getNetWorthIncomeBreakdown(query),
    options,
  )
}
export function useNetWorthRecentActivityQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthRecentActivityHttpResponse>,
) {
  return useNetWorthWidget(
    "recent-activity",
    query,
    () => getNetWorthRecentActivity(query),
    options,
  )
}
export function useNetWorthCreditCardsQuery(
  query: NetWorthHttpQuery,
  options?: AppQueryOptions<GetNetWorthCreditCardsHttpResponse>,
) {
  return useNetWorthWidget(
    "credit-cards",
    query,
    () => getNetWorthCreditCards(query),
    options,
  )
}
