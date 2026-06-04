import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import type { Currency } from './currencies.types';

class CurrenciesRepository {
  async list(): Promise<Currency[]> {
    return db
      .select({
        code: currenciesTable.code,
        symbol: currenciesTable.symbol,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .orderBy(asc(currenciesTable.code));
  }

  async findByCode(currencyCode: string): Promise<Currency | undefined> {
    const rows = await db
      .select({
        code: currenciesTable.code,
        symbol: currenciesTable.symbol,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .where(eq(currenciesTable.code, currencyCode))
      .limit(1);

    return rows[0];
  }

  async listPrecisions(currencyCodes: string[]): Promise<Record<string, number>> {
    if (currencyCodes.length === 0) {
      return {};
    }

    const rows = await db
      .select({
        code: currenciesTable.code,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .where(inArray(currenciesTable.code, currencyCodes));

    return Object.fromEntries(rows.map((row) => [row.code, row.precision]));
  }
}

export const currenciesRepository = new CurrenciesRepository();
