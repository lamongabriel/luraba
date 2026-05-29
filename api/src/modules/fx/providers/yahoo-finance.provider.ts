import YahooFinance from 'yahoo-finance2';
import { ValidationError } from '@/shared/errors';
import type { FxProvider, FxProviderRate } from '../fx.types';
import { addFxDays, formatFxDate } from '../fx.utils';

type YahooChartRow = {
  date: Date;
  close: number | null;
};

type YahooChartResult = YahooChartRow[] | { quotes?: YahooChartRow[] };

type YahooFinanceClient = {
  chart: (
    symbol: string,
    options: {
      period1: Date;
      period2: Date;
      interval: '1d';
      return: 'array';
    },
  ) => Promise<YahooChartResult>;
};

type YahooFinanceConstructor = new () => YahooFinanceClient;

function createYahooFinanceClient(): YahooFinanceClient {
  return new (YahooFinance as YahooFinanceConstructor)();
}

function buildFxSymbol(baseCurrencyCode: string, quoteCurrencyCode: string): string {
  return `${baseCurrencyCode}${quoteCurrencyCode}=X`;
}

function toChartRows(result: YahooChartResult): YahooChartRow[] {
  if (Array.isArray(result)) {
    return result;
  }

  return Array.isArray(result.quotes) ? result.quotes : [];
}

async function getHistoricalChartRate(
  client: YahooFinanceClient,
  baseCurrencyCode: string,
  quoteCurrencyCode: string,
  date: Date,
): Promise<FxProviderRate | undefined> {
  const chartResult = await client.chart(buildFxSymbol(baseCurrencyCode, quoteCurrencyCode), {
    period1: addFxDays(date, -7),
    period2: addFxDays(date, 1),
    interval: '1d',
    return: 'array',
  });
  const quotes = toChartRows(chartResult);

  const targetDay = date.getTime();
  const row = quotes
    .filter((quote) => quote.close !== null)
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .filter((quote) => quote.date.getTime() <= targetDay)
    .at(-1);

  if (!row?.close) {
    return undefined;
  }

  return {
    provider: 'yahoo-finance2',
    fromCurrencyCode: baseCurrencyCode,
    toCurrencyCode: quoteCurrencyCode,
    rateDate: new Date(`${formatFxDate(row.date)}T00:00:00.000Z`),
    rate: row.close,
  };
}

export class YahooFinanceFxProvider implements FxProvider {
  readonly id = 'yahoo-finance2' as const;

  constructor(private readonly client: YahooFinanceClient = createYahooFinanceClient()) { }

  async healthCheck(): Promise<void> {
    const rates = await this.getLatestRates('USD', ['BRL']);
    if (rates.length === 0) {
      throw new ValidationError('Yahoo Finance did not return any rates during health check');
    }
  }

  async getLatestRates(baseCurrencyCode: string, quoteCurrencyCodes: string[]): Promise<FxProviderRate[]> {
    const today = new Date();
    const rates = await Promise.all(
      quoteCurrencyCodes.map((quoteCurrencyCode) =>
        getHistoricalChartRate(this.client, baseCurrencyCode, quoteCurrencyCode, today),
      ),
    );

    return rates.filter((rate): rate is FxProviderRate => rate !== undefined);
  }

  async getHistoricalRates(baseCurrencyCode: string, quoteCurrencyCodes: string[], date: Date): Promise<FxProviderRate[]> {
    const rates = await Promise.all(
      quoteCurrencyCodes.map((quoteCurrencyCode) =>
        getHistoricalChartRate(this.client, baseCurrencyCode, quoteCurrencyCode, date),
      ),
    );

    return rates.filter((rate): rate is FxProviderRate => rate !== undefined);
  }

  async getTimeSeries(baseCurrencyCode: string, quoteCurrencyCodes: string[], from: Date, to: Date): Promise<FxProviderRate[]> {
    if (quoteCurrencyCodes.length !== 1) {
      throw new ValidationError('Yahoo Finance time-series sync supports one quote currency at a time');
    }

    const quoteCurrencyCode = quoteCurrencyCodes[0];
    const chartResult = await this.client.chart(buildFxSymbol(baseCurrencyCode, quoteCurrencyCode), {
      period1: from,
      period2: addFxDays(to, 1),
      interval: '1d',
      return: 'array',
    });
    const quotes = toChartRows(chartResult);

    return quotes
      .filter((quote) => quote.close !== null)
      .map((quote) => ({
        provider: this.id,
        fromCurrencyCode: baseCurrencyCode,
        toCurrencyCode: quoteCurrencyCode,
        rateDate: new Date(`${formatFxDate(quote.date)}T00:00:00.000Z`),
        rate: quote.close!,
      }));
  }
}
