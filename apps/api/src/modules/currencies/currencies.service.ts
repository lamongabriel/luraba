import { fxService } from '@/modules/fx/fx.service';
import { NotFoundError } from '@/shared/errors';
import { formatISODate, now } from '@/shared/lib/date';
import { createListMeta, type ListResult } from '@/shared/list';
import type { ListCurrenciesRequestQuery } from './currencies.query';
import { currenciesRepository } from './currencies.repository';
import type {
  GetCurrencyRateRequestQuery,
  GetCurrencyRateResponse,
  ListCurrenciesResponse,
} from './currencies.types';

function formatRate(rateNumerator: number, rateDenominator: number): number {
  const decimalRate = rateNumerator / rateDenominator;
  return Math.round((decimalRate + Number.EPSILON) * 100) / 100;
}

export async function listCurrencies(
  query: ListCurrenciesRequestQuery,
): Promise<ListResult<ListCurrenciesResponse[number]>> {
  const page = await currenciesRepository.listPage(query);

  return {
    data: page.rows,
    meta: createListMeta(query, page.totalCount),
  };
}

export async function getCurrencyRate(
  query: GetCurrencyRateRequestQuery,
): Promise<GetCurrencyRateResponse> {
  const [fromCurrency, toCurrency] = await Promise.all([
    currenciesRepository.findByCode(query.fromCurrencyCode),
    currenciesRepository.findByCode(query.toCurrencyCode),
  ]);

  if (!fromCurrency) {
    throw new NotFoundError('Currency');
  }

  if (!toCurrency) {
    throw new NotFoundError('Currency');
  }

  const date = query.date ?? now();
  const rate = await fxService.getRate({
    fromCurrencyCode: fromCurrency.code,
    toCurrencyCode: toCurrency.code,
    date,
    provider: query.provider,
  });

  const convertedAmount =
    query.amount === undefined
      ? undefined
      : await fxService.convertAmount({
          amount: query.amount,
          fromCurrencyCode: fromCurrency.code,
          toCurrencyCode: toCurrency.code,
          date,
          provider: query.provider,
        });

  return {
    fromCurrency,
    toCurrency,
    provider: rate.provider,
    rateDate: formatISODate(rate.rateDate),
    rate: formatRate(rate.rateNumerator, rate.rateDenominator),
    amount: query.amount,
    convertedAmount,
  };
}
