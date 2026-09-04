"use client"

import { useQuery } from "@tanstack/react-query"

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

type NetWorthQuery = Parameters<typeof getNetWorthSummary>[0]
type NetWorthSummaryResponse = Awaited<ReturnType<typeof getNetWorthSummary>>
type NetWorthHistoryResponse = Awaited<ReturnType<typeof getNetWorthHistory>>
type NetWorthAccountsResponse = Awaited<ReturnType<typeof getNetWorthAccounts>>
type NetWorthCashFlowResponse = Awaited<ReturnType<typeof getNetWorthCashFlow>>
type NetWorthBreakdownResponse = Awaited<
  ReturnType<typeof getNetWorthSpendingBreakdown>
>
type NetWorthRecentActivityResponse = Awaited<
  ReturnType<typeof getNetWorthRecentActivity>
>
type NetWorthCreditCardsResponse = Awaited<
  ReturnType<typeof getNetWorthCreditCards>
>

export const netWorthQueryKeys = {
  all: ["networth"] as const,
  widget: (name: string, query: NetWorthQuery) =>
    [...netWorthQueryKeys.all, name, query] as const,
}

function useNetWorthWidget<TData>(
  name: string,
  query: NetWorthQuery,
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
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthSummaryResponse>,
) {
  return useNetWorthWidget(
    "summary",
    query,
    () => getNetWorthSummary(query),
    options,
  )
}
export function useNetWorthHistoryQuery(
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthHistoryResponse>,
) {
  return useNetWorthWidget(
    "history",
    query,
    () => getNetWorthHistory(query),
    options,
  )
}
export function useNetWorthAccountsQuery(
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthAccountsResponse>,
) {
  return useNetWorthWidget(
    "accounts",
    query,
    () => getNetWorthAccounts(query),
    options,
  )
}
export function useNetWorthCashFlowQuery(
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthCashFlowResponse>,
) {
  return useNetWorthWidget(
    "cash-flow",
    query,
    () => getNetWorthCashFlow(query),
    options,
  )
}
export function useNetWorthSpendingQuery(
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthBreakdownResponse>,
) {
  return useNetWorthWidget(
    "spending",
    query,
    () => getNetWorthSpendingBreakdown(query),
    options,
  )
}
export function useNetWorthIncomeQuery(
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthBreakdownResponse>,
) {
  return useNetWorthWidget(
    "income",
    query,
    () => getNetWorthIncomeBreakdown(query),
    options,
  )
}
export function useNetWorthRecentActivityQuery(
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthRecentActivityResponse>,
) {
  return useNetWorthWidget(
    "recent-activity",
    query,
    () => getNetWorthRecentActivity(query),
    options,
  )
}
export function useNetWorthCreditCardsQuery(
  query: NetWorthQuery,
  options?: AppQueryOptions<NetWorthCreditCardsResponse>,
) {
  return useNetWorthWidget(
    "credit-cards",
    query,
    () => getNetWorthCreditCards(query),
    options,
  )
}
