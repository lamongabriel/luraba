import { afterEach, describe, expect, it, vi } from 'vitest';
import { fxService } from '@/modules/fx/fx.service';
import { NotFoundError } from '@/shared/errors';
import { ListCurrenciesRequestQuerySchema } from '../currencies.query';
import * as currenciesService from '../currencies.service';

describe('currencies service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists seeded currencies ordered by code', async () => {
    const currencies = await currenciesService.listCurrencies(
      ListCurrenciesRequestQuerySchema.parse({}),
    );

    expect(currencies.data.map((currency) => currency.code)).toEqual(
      [...currencies.data.map((currency) => currency.code)].sort(),
    );
    expect(currencies.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BRL', symbol: 'R$', precision: 2 }),
        expect.objectContaining({ code: 'USD', symbol: '$', precision: 2 }),
      ]),
    );
  });

  it('returns a formatted exchange-rate quote with converted amount', async () => {
    const rateDate = new Date('2026-05-03T00:00:00.000Z');
    const getRateSpy = vi.spyOn(fxService, 'getRate').mockResolvedValue({
      provider: 'frankfurter',
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'BRL',
      rateDate,
      rateNumerator: 49835,
      rateDenominator: 10000,
    });
    const convertAmountSpy = vi.spyOn(fxService, 'convertAmount').mockResolvedValue(49_835);

    const quote = await currenciesService.getCurrencyRate({
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'BRL',
      date: rateDate,
      amount: 10_000,
      provider: 'frankfurter',
    });

    expect(getRateSpy).toHaveBeenCalledWith({
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'BRL',
      date: rateDate,
      provider: 'frankfurter',
    });
    expect(convertAmountSpy).toHaveBeenCalledWith({
      amount: 10_000,
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'BRL',
      date: rateDate,
      provider: 'frankfurter',
    });
    expect(quote).toEqual({
      fromCurrency: { code: 'USD', symbol: '$', precision: 2 },
      toCurrency: { code: 'BRL', symbol: 'R$', precision: 2 },
      provider: 'frankfurter',
      rateDate: '2026-05-03',
      rate: 4.98,
      amount: 10_000,
      convertedAmount: 49_835,
    });
  });

  it('does not convert an amount when amount is omitted', async () => {
    vi.spyOn(fxService, 'getRate').mockResolvedValue({
      provider: 'frankfurter',
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'BRL',
      rateDate: new Date('2026-05-03T00:00:00.000Z'),
      rateNumerator: 49835,
      rateDenominator: 10000,
    });
    const convertAmountSpy = vi.spyOn(fxService, 'convertAmount');

    const quote = await currenciesService.getCurrencyRate({
      fromCurrencyCode: 'USD',
      toCurrencyCode: 'BRL',
      date: new Date('2026-05-03T00:00:00.000Z'),
    });

    expect(convertAmountSpy).not.toHaveBeenCalled();
    expect(quote.amount).toBeUndefined();
    expect(quote.convertedAmount).toBeUndefined();
  });

  it('rejects unknown source currencies', async () => {
    await expect(
      currenciesService.getCurrencyRate({
        fromCurrencyCode: 'ZZZ',
        toCurrencyCode: 'BRL',
        date: new Date('2026-05-03T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects unknown target currencies', async () => {
    await expect(
      currenciesService.getCurrencyRate({
        fromCurrencyCode: 'USD',
        toCurrencyCode: 'ZZZ',
        date: new Date('2026-05-03T00:00:00.000Z'),
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('currencies DB list filters', () => {
  it('combines search, code, precision, sorting, and pagination in SQL', async () => {
    const result = await currenciesService.listCurrencies(
      ListCurrenciesRequestQuerySchema.parse({
        search: 'R$',
        codes: 'BRL,USD',
        precisions: '2',
        sort: 'code',
        sortDirection: 'desc',
        perPage: 1,
      }),
    );

    expect(result.data).toEqual([expect.objectContaining({ code: 'BRL', precision: 2 })]);
    expect(result.meta.pagination).toEqual({
      page: 1,
      perPage: 1,
      totalCount: 1,
      totalPages: 1,
    });
  });
});
