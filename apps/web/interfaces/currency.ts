export interface Currency {
  code: string
  symbol: string
  precision: number
}

export type FxProvider = "frankfurter" | "yahoo-finance2"

export interface CurrencyRate {
  fromCurrency: Currency
  toCurrency: Currency
  provider: FxProvider
  rateDate: string
  rate: number
  amount?: number
  convertedAmount?: number
}
