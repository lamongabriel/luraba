import { FX_PROVIDER_IDS } from '@/config/fx';

export type FxProviderId = (typeof FX_PROVIDER_IDS)[number];

export type FxProviderRate = {
  provider: FxProviderId;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rateDate: Date;
  rate: string | number;
};

export type FxResolvedRate = {
  provider: FxProviderId;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rateDate: Date;
  rateNumerator: number;
  rateDenominator: number;
};

export type FxRateQuery = {
  fromCurrencyCode: string;
  toCurrencyCode: string;
  date: Date;
  provider?: FxProviderId;
};

export type FxConversionInput = FxRateQuery & {
  amount: number;
};

export type FxValuationInput = {
  amount: number;
  currencyCode: string;
  effectiveDate: Date;
};

export type FxGroupedValuationInput<TKey extends string = string> = FxValuationInput & {
  groupKey: TKey;
};

export interface FxProvider {
  readonly id: FxProviderId;
  healthCheck(): Promise<void>;
  getLatestRates(baseCurrencyCode: string, quoteCurrencyCodes: string[]): Promise<FxProviderRate[]>;
  getHistoricalRates(baseCurrencyCode: string, quoteCurrencyCodes: string[], date: Date): Promise<FxProviderRate[]>;
  getTimeSeries?(baseCurrencyCode: string, quoteCurrencyCodes: string[], from: Date, to: Date): Promise<FxProviderRate[]>;
}
