import type {
  NetWorthAccounts,
  NetWorthBreakdown,
  NetWorthCashFlow,
  NetWorthCreditCards,
  NetWorthHistory,
  NetWorthRecentActivity,
  NetWorthSummary,
} from "@/interfaces/networth"

export interface NetWorthHttpQuery {
  dateFrom?: string
  dateTo?: string
  displayCurrencyCode?: string
  granularity?: "day" | "week" | "month"
  limit?: number
}

export type GetNetWorthSummaryHttpResponse = NetWorthSummary
export type GetNetWorthHistoryHttpResponse = NetWorthHistory
export type GetNetWorthAccountsHttpResponse = NetWorthAccounts
export type GetNetWorthCashFlowHttpResponse = NetWorthCashFlow
export type GetNetWorthBreakdownHttpResponse = NetWorthBreakdown
export type GetNetWorthRecentActivityHttpResponse = NetWorthRecentActivity
export type GetNetWorthCreditCardsHttpResponse = NetWorthCreditCards
