export interface NetWorthAmount {
  amount: number
  currencyCode: string
}

export interface NetWorthSummary {
  dateFrom: string
  dateTo: string
  displayCurrencyCode: string
  totalBalance: NetWorthAmount
  assets: NetWorthAmount
  liabilities: NetWorthAmount
  netWorth: NetWorthAmount
  income: NetWorthAmount
  expenses: NetWorthAmount
  transferCount: number
}

export interface NetWorthHistory {
  dateFrom: string
  dateTo: string
  displayCurrencyCode: string
  granularity: "day" | "week" | "month"
  points: Array<{ date: string; netWorth: number }>
}

export interface NetWorthAccounts {
  displayCurrencyCode: string
  assets: Array<{
    id: string
    name: string
    type: string
    currencyCode: string
    balance: number
  }>
  liabilities: Array<{
    id: string
    name: string
    type: string
    currencyCode: string
    balance: number
  }>
}

export interface NetWorthCashFlow {
  dateFrom: string
  dateTo: string
  displayCurrencyCode: string
  granularity: "day" | "week" | "month"
  points: Array<{ date: string; income: number; expenses: number }>
}

export interface NetWorthBreakdown {
  dateFrom: string
  dateTo: string
  displayCurrencyCode: string
  items: Array<{
    id: string | null
    name: string
    amount: number
    percentage: number
  }>
}

export interface NetWorthRecentActivity {
  rows: Array<Record<string, unknown>>
}

export interface NetWorthCreditCards {
  displayCurrencyCode: string
  cards: Array<{
    id: string
    name: string
    brand: string
    last4: string
    currencyCode: string
    creditLimitAmount: number
    balance: number
    remainingAmount: number
    utilizationPercentage: number
  }>
}
