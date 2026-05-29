import { ValidationError } from '@/shared/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrankfurterFxProvider } from '../providers/frankfurter.provider';

describe('FrankfurterFxProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and maps latest rates', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            date: '2026-05-29',
            base: 'USD',
            quote: 'BRL',
            rate: 5.12,
          },
        ]),
        { status: 200 },
      ),
    );

    const provider = new FrankfurterFxProvider();
    const rates = await provider.getLatestRates('USD', ['BRL']);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));

    expect(requestUrl.origin + requestUrl.pathname).toBe('https://api.frankfurter.dev/v2/rates');
    expect(requestUrl.searchParams.get('base')).toBe('USD');
    expect(requestUrl.searchParams.get('quotes')).toBe('BRL');
    expect(requestUrl.searchParams.has('providers')).toBe(false);
    expect(rates).toEqual([
      {
        provider: 'frankfurter',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-29T00:00:00.000Z'),
        rate: 5.12,
      },
    ]);
  });

  it('fetches historical rates for a specific date', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            date: '2026-05-20',
            base: 'USD',
            quote: 'EUR',
            rate: 0.88,
          },
        ]),
        { status: 200 },
      ),
    );

    const provider = new FrankfurterFxProvider();
    await provider.getHistoricalRates('USD', ['EUR'], new Date('2026-05-20T18:42:00.000Z'));

    const requestUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get('date')).toBe('2026-05-20');
    expect(requestUrl.searchParams.has('providers')).toBe(false);
  });

  it('keeps exact weekend dates when Frankfurter default rates return them', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            date: '2026-05-03',
            base: 'USD',
            quote: 'BRL',
            rate: 4.9835,
          },
        ]),
        { status: 200 },
      ),
    );

    const provider = new FrankfurterFxProvider();
    const rates = await provider.getHistoricalRates('USD', ['BRL'], new Date('2026-05-03T00:00:00.000Z'));

    expect(rates).toEqual([
      {
        provider: 'frankfurter',
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'BRL',
        rateDate: new Date('2026-05-03T00:00:00.000Z'),
        rate: 4.9835,
      },
    ]);
  });

  it('fetches time-series rates for a date range', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const provider = new FrankfurterFxProvider();
    await provider.getTimeSeries(
      'USD',
      ['BRL', 'EUR'],
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-07T00:00:00.000Z'),
    );

    const requestUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get('from')).toBe('2026-05-01');
    expect(requestUrl.searchParams.get('to')).toBe('2026-05-07');
    expect(requestUrl.searchParams.get('quotes')).toBe('BRL,EUR');
    expect(requestUrl.searchParams.has('providers')).toBe(false);
  });

  it('throws a validation error when Frankfurter returns a non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('boom', { status: 503 }));

    const provider = new FrankfurterFxProvider();

    await expect(provider.getLatestRates('USD', ['BRL'])).rejects.toThrow(ValidationError);
    await expect(provider.getLatestRates('USD', ['BRL'])).rejects.toThrow(
      'Frankfurter returned 503 while fetching exchange rates',
    );
  });
});
