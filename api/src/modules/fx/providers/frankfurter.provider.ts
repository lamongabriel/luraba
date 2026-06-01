import { FRANKFURTER_API_URL } from '@/config/fx';
import { ValidationError } from '@/shared/errors';
import { formatISODate as formatFxDate, parseISODate as parseFxDate } from '@/shared/lib/date';
import type { FxProvider, FxProviderRate } from '../fx.types';

type FrankfurterRateRow = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

async function fetchRates(url: URL): Promise<FrankfurterRateRow[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ValidationError(`Frankfurter returned ${response.status} while fetching exchange rates`);
  }

  return (await response.json()) as FrankfurterRateRow[];
}

export class FrankfurterFxProvider implements FxProvider {
  readonly id = 'frankfurter' as const;

  async healthCheck(): Promise<void> {
    const rates = await this.getLatestRates('USD', ['BRL']);
    if (rates.length === 0) {
      throw new ValidationError('Frankfurter did not return any rates during health check');
    }
  }

  async getLatestRates(baseCurrencyCode: string, quoteCurrencyCodes: string[]): Promise<FxProviderRate[]> {
    const url = new URL(`${FRANKFURTER_API_URL}/rates`);
    url.searchParams.set('base', baseCurrencyCode);
    url.searchParams.set('quotes', quoteCurrencyCodes.join(','));

    const rows = await fetchRates(url);
    return rows.map((row) => ({
      provider: this.id,
      fromCurrencyCode: row.base,
      toCurrencyCode: row.quote,
      rateDate: parseFxDate(row.date),
      rate: row.rate,
    }));
  }

  async getHistoricalRates(baseCurrencyCode: string, quoteCurrencyCodes: string[], date: Date): Promise<FxProviderRate[]> {
    const url = new URL(`${FRANKFURTER_API_URL}/rates`);
    url.searchParams.set('base', baseCurrencyCode);
    url.searchParams.set('quotes', quoteCurrencyCodes.join(','));
    url.searchParams.set('date', formatFxDate(date));

    const rows = await fetchRates(url);
    return rows.map((row) => ({
      provider: this.id,
      fromCurrencyCode: row.base,
      toCurrencyCode: row.quote,
      rateDate: parseFxDate(row.date),
      rate: row.rate,
    }));
  }

  async getTimeSeries(baseCurrencyCode: string, quoteCurrencyCodes: string[], from: Date, to: Date): Promise<FxProviderRate[]> {
    const url = new URL(`${FRANKFURTER_API_URL}/rates`);
    url.searchParams.set('base', baseCurrencyCode);
    url.searchParams.set('quotes', quoteCurrencyCodes.join(','));
    url.searchParams.set('from', formatFxDate(from));
    url.searchParams.set('to', formatFxDate(to));

    const rows = await fetchRates(url);
    return rows.map((row) => ({
      provider: this.id,
      fromCurrencyCode: row.base,
      toCurrencyCode: row.quote,
      rateDate: parseFxDate(row.date),
      rate: row.rate,
    }));
  }
}
