"use client"
import {
  type GetNetWorthAccountsResult,
  type GetNetWorthCashFlowResult,
  type GetNetWorthCreditCardsResult,
  type GetNetWorthHistoryResult,
  type GetNetWorthIncomeBreakdownResult,
  type GetNetWorthRecentActivityResult,
  type GetNetWorthSpendingBreakdownResult,
  type GetNetWorthSummaryResult,
  type NetWorthQuery,
  netWorthEndpoints,
} from "@luraba/contracts"
import { requestContract } from "@/services/contract-client.service"

export function getNetWorthSummary(
  query: NetWorthQuery = {},
): Promise<GetNetWorthSummaryResult> {
  return requestContract(netWorthEndpoints.summary, { query })
}

export function getNetWorthHistory(
  query: NetWorthQuery = {},
): Promise<GetNetWorthHistoryResult> {
  return requestContract(netWorthEndpoints.history, { query })
}

export function getNetWorthAccounts(
  query: NetWorthQuery = {},
): Promise<GetNetWorthAccountsResult> {
  return requestContract(netWorthEndpoints.accounts, { query })
}

export function getNetWorthCashFlow(
  query: NetWorthQuery = {},
): Promise<GetNetWorthCashFlowResult> {
  return requestContract(netWorthEndpoints.cashFlow, { query })
}

export function getNetWorthSpendingBreakdown(
  query: NetWorthQuery = {},
): Promise<GetNetWorthSpendingBreakdownResult> {
  return requestContract(netWorthEndpoints.spendingBreakdown, { query })
}

export function getNetWorthIncomeBreakdown(
  query: NetWorthQuery = {},
): Promise<GetNetWorthIncomeBreakdownResult> {
  return requestContract(netWorthEndpoints.incomeBreakdown, { query })
}

export function getNetWorthRecentActivity(
  query: NetWorthQuery = {},
): Promise<GetNetWorthRecentActivityResult> {
  return requestContract(netWorthEndpoints.recentActivity, { query })
}

export function getNetWorthCreditCards(
  query: NetWorthQuery = {},
): Promise<GetNetWorthCreditCardsResult> {
  return requestContract(netWorthEndpoints.creditCards, { query })
}
