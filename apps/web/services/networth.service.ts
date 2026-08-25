"use client"

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
import { getApiData } from "@/services/api-client.service"
import { serializeHttpQuery } from "@/services/http-query"

function params(query: NetWorthHttpQuery) {
  return { params: serializeHttpQuery(query) }
}

export const getNetWorthSummary = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthSummaryHttpResponse>("/networth/summary", params(query))
export const getNetWorthHistory = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthHistoryHttpResponse>("/networth/history", params(query))
export const getNetWorthAccounts = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthAccountsHttpResponse>(
    "/networth/accounts",
    params(query),
  )
export const getNetWorthCashFlow = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthCashFlowHttpResponse>(
    "/networth/cash-flow",
    params(query),
  )
export const getNetWorthSpendingBreakdown = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthBreakdownHttpResponse>(
    "/networth/spending-breakdown",
    params(query),
  )
export const getNetWorthIncomeBreakdown = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthBreakdownHttpResponse>(
    "/networth/income-breakdown",
    params(query),
  )
export const getNetWorthRecentActivity = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthRecentActivityHttpResponse>(
    "/networth/recent-activity",
    params(query),
  )
export const getNetWorthCreditCards = (query: NetWorthHttpQuery = {}) =>
  getApiData<GetNetWorthCreditCardsHttpResponse>(
    "/networth/credit-cards",
    params(query),
  )
