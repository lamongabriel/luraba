import type {
  Currency,
  CurrencyRate,
  getCurrencyRateQuerySchema,
} from "@luraba/contracts/currencies";
import { formatISODate, fractionToFxRate, now } from "@luraba/domain";
import type { z } from "zod";
import { fxService } from "@/modules/fx/fx.service";
import { NotFoundError } from "@/shared/errors";
import { createListMeta, type ListResult } from "@/shared/list";
import type { ListCurrenciesQuery } from "./currencies.query";
import { currenciesRepository } from "./currencies.repository";

type CurrencyRateQuery = z.output<typeof getCurrencyRateQuerySchema>;

/**
 * The rate at full precision (up to 14 decimals). It used to be rounded to 2 decimals, which made a
 * BRL to USD rate of 0.1808 read 0.18 and skewed every amount converted with it (goal contributions).
 */
function formatRate(rateNumerator: number, rateDenominator: number): number {
  return Number(fractionToFxRate(rateNumerator, rateDenominator));
}

export async function listCurrencies(query: ListCurrenciesQuery): Promise<ListResult<Currency>> {
  const page = await currenciesRepository.listPage(query);

  return {
    data: page.rows,
    meta: createListMeta(query, page.totalCount),
  };
}

export async function getCurrencyRate(query: CurrencyRateQuery): Promise<CurrencyRate> {
  const [fromCurrency, toCurrency] = await Promise.all([
    currenciesRepository.findByCode(query.fromCurrencyCode),
    currenciesRepository.findByCode(query.toCurrencyCode),
  ]);

  if (!fromCurrency) {
    throw new NotFoundError("Currency");
  }

  if (!toCurrency) {
    throw new NotFoundError("Currency");
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
