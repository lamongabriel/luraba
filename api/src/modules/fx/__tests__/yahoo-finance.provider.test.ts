import { ValidationError } from '@/shared/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { YahooFinanceFxProvider } from '../providers/yahoo-finance.provider';

describe('YahooFinanceFxProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the latest historical quote on or before the requested date', async () => {
    const chart = vi.fn().mockResolvedValue([
      { date: new Date('2026-05-18T00:00:00.000Z'), close: 5.11 },
      { date: new Date('2026-05-19T00:00:00.000Z'), close: null },
      { date: new Date('2026-05-20T00:00:00.000Z'), close: 5.22 },
      { date: new Date('2026-05-21T00:00:00.000Z'), close: 5.3 },
    ]);

    const provider = new YahooFinanceFxProvider({ chart });
    const rates = await provider.getHistoricalRates('USD', ['BRL'], new Date('2026-05-20T16:00:00.000Z'));

    expect(chart).toHaveBeenCalledWith(
      'USDBRL=X',
      expect.objectContaining({
        interval: '1d',
        return: 'array',
      }),
    );
    expect(rates).toEqual([
      {
        provider: 'yahoo-finance2',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-20T00:00:00.000Z'),
        rate: 5.22,
      },
    ]);
  });

  it('supports chart results that return a quotes object', async () => {
    const chart = vi.fn().mockResolvedValue({
      quotes: [
        { date: new Date('2026-05-20T00:00:00.000Z'), close: 0.88 },
        { date: new Date('2026-05-21T00:00:00.000Z'), close: 0.89 },
      ],
    });

    const provider = new YahooFinanceFxProvider({ chart });
    const rates = await provider.getHistoricalRates('USD', ['EUR'], new Date('2026-05-21T00:00:00.000Z'));

    expect(rates[0]).toEqual({
      provider: 'yahoo-finance2',
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'EUR',
      rateDate: new Date('2026-05-21T00:00:00.000Z'),
      rate: 0.89,
    });
  });

  it('uses today when fetching latest rates', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));

    const chart = vi.fn().mockResolvedValue([
      { date: new Date('2026-05-28T00:00:00.000Z'), close: 5.01 },
      { date: new Date('2026-05-29T00:00:00.000Z'), close: 5.04 },
    ]);

    const provider = new YahooFinanceFxProvider({ chart });
    const rates = await provider.getLatestRates('USD', ['BRL']);

    expect(chart).toHaveBeenCalledWith(
      'USDBRL=X',
      expect.objectContaining({
        period1: new Date('2026-05-22T12:00:00.000Z'),
        period2: new Date('2026-05-30T12:00:00.000Z'),
      }),
    );
    expect(rates[0]?.rate).toBe(5.04);
  });

  it('returns full time-series rows for one quote currency', async () => {
    const chart = vi.fn().mockResolvedValue([
      { date: new Date('2026-05-20T00:00:00.000Z'), close: 5.01 },
      { date: new Date('2026-05-21T00:00:00.000Z'), close: null },
      { date: new Date('2026-05-22T00:00:00.000Z'), close: 5.03 },
    ]);

    const provider = new YahooFinanceFxProvider({ chart });
    const rates = await provider.getTimeSeries(
      'USD',
      ['BRL'],
      new Date('2026-05-20T00:00:00.000Z'),
      new Date('2026-05-22T00:00:00.000Z'),
    );

    expect(rates).toEqual([
      {
        provider: 'yahoo-finance2',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-20T00:00:00.000Z'),
        rate: 5.01,
      },
      {
        provider: 'yahoo-finance2',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-22T00:00:00.000Z'),
        rate: 5.03,
      },
    ]);
  });

  it('rejects time-series requests with multiple quote currencies', async () => {
    const provider = new YahooFinanceFxProvider({ chart: vi.fn() });

    await expect(
      provider.getTimeSeries(
        'USD',
        ['BRL', 'EUR'],
        new Date('2026-05-20T00:00:00.000Z'),
        new Date('2026-05-22T00:00:00.000Z'),
      ),
    ).rejects.toThrow(ValidationError);
  });
});
