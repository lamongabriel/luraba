import type { BaseListHttpQuery, ListResponse } from "@/interfaces/api"
import type { Currency, CurrencyRate, FxProvider } from "@/interfaces/currency"

export type CurrencySortField = "code" | "symbol" | "precision"

export interface ListCurrenciesHttpQuery
  extends BaseListHttpQuery<CurrencySortField> {
  codes?: string[]
  precisions?: number[]
}

export type ListCurrenciesHttpResponse = ListResponse<Currency>

export interface GetCurrencyRateHttpQuery {
  fromCurrencyCode: string
  toCurrencyCode: string
  date?: string
  amount?: number
  provider?: FxProvider
}

export type GetCurrencyRateHttpResponse = CurrencyRate
