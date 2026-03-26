import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { Currency } from './currencies.types';

export async function listCurrencies(): Promise<Currency[]> {
  return db.select().from(currenciesTable).orderBy(asc(currenciesTable.code));
}
