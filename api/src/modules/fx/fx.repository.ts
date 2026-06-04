import { and, desc, eq, lte } from 'drizzle-orm';
import { db } from '@/db';
import { exchangeRatesTable } from '@/db/schemas/exchange-rates.schema';
import { formatISODate } from '@/shared/lib/date';
import type { FxProviderId, FxResolvedRate } from './fx.types';

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
          eq(exchangeRatesTable.rateDate, formatISODate(date)),
        ),
      )
      .limit(1);

    return rows[0];
  }

  async findRateOnOrBefore(
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
          lte(exchangeRatesTable.rateDate, formatISODate(date)),
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
          rateDate: formatISODate(rate.rateDate),
        })),
      )
      .onConflictDoNothing();
  }
}

export const fxRateRepository = new FxRateRepository();
