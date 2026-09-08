import { currenciesRepository } from "@/modules/currencies/currencies.repository";
import { fxService } from "./fx.service";

async function resolveQuoteCurrencyCodes(
  baseCurrencyCode: string,
  quoteCurrencyCodes?: string[],
): Promise<string[]> {
  if (quoteCurrencyCodes && quoteCurrencyCodes.length > 0) {
    return quoteCurrencyCodes
      .map((currencyCode) => currencyCode.toUpperCase())
      .filter((currencyCode) => currencyCode !== baseCurrencyCode);
  }

  const currencies = await currenciesRepository.list();
  return currencies
    .map((currency) => currency.code)
    .filter((currencyCode) => currencyCode !== baseCurrencyCode);
}

export async function syncLatestFxRates(
  baseCurrencyCode: string,
  quoteCurrencyCodes?: string[],
): Promise<void> {
  const normalizedBaseCurrencyCode = baseCurrencyCode.toUpperCase();
  const normalizedQuoteCurrencyCodes = await resolveQuoteCurrencyCodes(
    normalizedBaseCurrencyCode,
    quoteCurrencyCodes,
  );
  await fxService.syncLatestRates(normalizedBaseCurrencyCode, normalizedQuoteCurrencyCodes);
}

export async function backfillFxRates(
  baseCurrencyCode: string,
  from: Date,
  to: Date,
  quoteCurrencyCodes?: string[],
): Promise<void> {
  const normalizedBaseCurrencyCode = baseCurrencyCode.toUpperCase();
  const normalizedQuoteCurrencyCodes = await resolveQuoteCurrencyCodes(
    normalizedBaseCurrencyCode,
    quoteCurrencyCodes,
  );
  await fxService.backfillRates(normalizedBaseCurrencyCode, normalizedQuoteCurrencyCodes, from, to);
}
