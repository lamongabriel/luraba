import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/db';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { exchangeRatesTable } from '@/db/schemas/exchange-rates.schema';
import type { FxProviderId, FxResolvedRate } from './fx.types';
import { formatFxDate } from './fx.utils';

type ExchangeRateRecord = typeof exchangeRatesTable.$inferSelect;

class FxRateRepository {
  async findRateByDate(
    provider: FxProviderId,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date: Date,
  ): Promise<ExchangeRateRecord | undefined> {
    const rows = await db
      .select()
      .from(exchangeRatesTable)
      .where(
        and(
          eq(exchangeRatesTable.provider, provider),
          eq(exchangeRatesTable.fromCurrencyId, fromCurrencyCode),
          eq(exchangeRatesTable.toCurrencyId, toCurrencyCode),
          eq(exchangeRatesTable.rateDate, formatFxDate(date)),
        ),
      )
      .limit(1);

    return rows[0];
  }

  async findRateOnOrBefore(provider: FxProviderId, fromCurrencyCode: string, toCurrencyCode: string, date: Date): Promise<ExchangeRateRecord | undefined> {
    const rows = await db
      .select()
      .from(exchangeRatesTable)
      .where(
        and(
          eq(exchangeRatesTable.provider, provider),
          eq(exchangeRatesTable.fromCurrencyId, fromCurrencyCode),
          eq(exchangeRatesTable.toCurrencyId, toCurrencyCode),
          lte(exchangeRatesTable.rateDate, formatFxDate(date)),
        ),
      )
      .orderBy(desc(exchangeRatesTable.rateDate))
      .limit(1);

    return rows[0];
  }

  async upsertRates(rates: FxResolvedRate[]): Promise<void> {
    if (rates.length === 0) {
      return;
    }

    await db
      .insert(exchangeRatesTable)
      .values(
        rates.map((rate) => ({
          provider: rate.provider,
          fromCurrencyId: rate.fromCurrencyCode,
          toCurrencyId: rate.toCurrencyCode,
          rateNumerator: rate.rateNumerator,
          rateDenominator: rate.rateDenominator,
          rateDate: formatFxDate(rate.rateDate),
        })),
      )
      .onConflictDoNothing();
  }

  async listCurrencyPrecisions(currencyCodes: string[]): Promise<Record<string, number>> {
    const rows = await db
      .select({
        code: currenciesTable.code,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .where(inArray(currenciesTable.code, currencyCodes));

    return Object.fromEntries(rows.map((row) => [row.code, row.precision]));
  }

  async findCurrencyByCode(currencyCode: string): Promise<{ code: string; precision: number } | undefined> {
    const rows = await db
      .select({
        code: currenciesTable.code,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .where(eq(currenciesTable.code, currencyCode))
      .limit(1);

    return rows[0];
  }
}

export const fxRateRepository = new FxRateRepository();
